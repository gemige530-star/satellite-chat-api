import fs from "fs/promises";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body ?? (await req.json?.());
    const message = body?.message;
    if (!message)
      return res.status(400).json({ error: "Missing 'message' in request body" });

    const isChinese = /[\u4e00-\u9fa5]/.test(message);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

    // ✅ 改进检测语句（更准确地捕获“语义图”指令）
    if (/\b(生成)?(语义图|semantic\s*graph)\b/i.test(message.trim())) {
      console.log(">>> ✅ 语义图逻辑触发");

      const nodes = [
        { id: "卫星艺术", group: 1 },
        { id: "太空想象", group: 2 },
        { id: "技术媒介", group: 2 },
        { id: "艺术家", group: 3 },
      ];

      const links = [
        { source: "卫星艺术", target: "太空想象" },
        { source: "卫星艺术", target: "技术媒介" },
        { source: "卫星艺术", target: "艺术家" },
      ];

      console.log(">>> ✅ 语义图数据生成完毕");

      // ✅ 改成前端预期的标准返回格式
      return res.status(200).json({
        success: true,
        type: "graph",
        data: { nodes, links },
      });
    }

    // 🌐 否则走对话逻辑
    const systemPrompt = isChinese
      ? "你是一位理性、简洁、自然流畅又富于生气的中文学者，用平实但有思想的语言表达，不要使用模板化或客套语气。"
      : "You are a rational, concise, and eloquent scholar. Write in natural, vivid English that is thoughtful yet unpretentious.";

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
          { role: "system", content: systemPrompt },
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
    if (!reply)
      return res.status(500).json({ error: "Malformed OpenAI response" });

    // ✅ 与前端格式统一
    return res.status(200).json({ success: true, type: "text", reply });
  } catch (err) {
    console.error("Handler Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
