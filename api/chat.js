import fs from "fs/promises";

export default async function handler(req, res) {
  // 允许跨域访问
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body ?? (await req.json?.());
    const message = body?.message;
    if (!message) return res.status(400).json({ error: "Missing 'message' in request body" });

    // 判断是否为中文
    const isChinese = /[\u4e00-\u9fa5]/.test(message);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

    // 1️⃣ 如果用户要求“生成语义图”，则读取 satellite_art.json 并处理
    if (/语义图|semantic graph|graph/i.test(message)) {
      // 读取本地 JSON 数据
      const raw = await fs.readFile("out/satellite_art.json", "utf-8");
      const data = JSON.parse(raw);

      // 提取关键词（简单做法：用空格或中文分词）
      const keywordMatch = message.match(/关于(.*?)的|related to (.*?)(\.|。|$)/i);
      const keyword = keywordMatch ? (keywordMatch[1] || keywordMatch[2]) : "";

      // 筛选相关条目
      const results = keyword
        ? data.filter(item =>
            JSON.stringify(item).includes(keyword)
          )
        : data.slice(0, 10); // 如果没关键词，就取前10条

      // 转换为语义图格式
      const nodes = [];
      const links = [];
      results.forEach(item => {
        const id = item.title || item.name || "unknown";
        nodes.push({ id, type: "artwork" });

        if (item.keywords) {
          item.keywords.forEach(k => {
            if (!nodes.find(n => n.id === k)) nodes.push({ id: k, type: "keyword" });
            links.push({ source: id, target: k, relation: "related_to" });
          });
        }
      });

      return res.status(200).json({
        type: "graph",
        keyword,
        nodeCount: nodes.length,
        linkCount: links.length,
        data: { nodes, links },
      });
    }

    // 2️⃣ 否则，走正常对话流程
    const chineseSystemPrompt =
      "你是一位理性、简洁、自然流畅又富于生气的中文学者，用平实但有思想的语言表达，不要使用模板化或客套语气。";
    const englishSystemPrompt =
      "You are a rational, concise, and eloquent scholar. Write in natural, vivid English that is thoughtful yet unpretentious.";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.8,
        top_p: 0.95,
        messages: [
          {
            role: "system",
            content: isChinese ? chineseSystemPrompt : englishSystemPrompt,
          },
          { role: "user", content: message },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API Error:", data);
      return res
        .status(response.status)
        .json({ error: data.error?.message || "OpenAI request failed" });
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) return res.status(500).json({ error: "Malformed OpenAI response" });

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Handler Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
