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
    const prompt = body?.prompt || body?.message;
    if (!prompt)
      return res.status(400).json({ error: "Missing 'prompt' in request body" });

    const isChinese = /[\u4e00-\u9fa5]/.test(prompt);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
    // ✅ 固定回答：卫星艺术定义
if (
  /what\s+is\s+satellite\s+art/i.test(prompt) ||
  /satellite\s+art\s+definition/i.test(prompt) ||
  /卫星艺术/.test(prompt)
) {
  return res.status(200).json({
  reply: {
    prompt: {
      id: "pmpt_6911cbdb43b0819090d2abc414797f100eefc3899a868814",
      version: "4"
    }
  }
});


  if (
  /(语义图|semantic\s*(graph|network)|orbit\s*distribution|关系图|relation\s*graph|知识图谱)/i.test(
    prompt.trim()
  )
) {

      let graph_type = "orbit_total";
      let nodes = [];
      let edges = [];

      if (/country/i.test(prompt)) {
        // 国家与轨道关系图
        graph_type = "country_orbit";
        nodes = [
          { id: "usa", label: "USA", category: "country", count: 2400 },
          { id: "china", label: "China", category: "country", count: 1600 },
          { id: "russia", label: "Russia", category: "country", count: 800 },
          { id: "leo", label: "LEO", category: "orbit", count: 5200 },
          { id: "geo", label: "GEO", category: "orbit", count: 1400 },
        ];
        edges = [
          { source: "usa", target: "leo", weight: 2 },
          { source: "china", target: "leo", weight: 3 },
          { source: "russia", target: "geo", weight: 1 },
        ];
      } else {
        // 轨道分布图
        graph_type = "orbit_total";
        nodes = [
          { id: "leo", label: "LEO", category: "orbit", count: 5200 },
          { id: "meo", label: "MEO", category: "orbit", count: 1800 },
          { id: "geo", label: "GEO", category: "orbit", count: 1400 },
        ];
        edges = [];
      }

      console.log(">>> ✅ 图表数据生成完毕");
      return res.status(200).json({
        type: "graph",
        data: { graph_type, nodes, edges },
      });
    }

    // ✅ 逻辑2：普通文字回复
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
          { role: "user", content: prompt },
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("OpenAI API Error:", data);
      return res.status(response.status).json({
        error: data.error?.message || "OpenAI request failed",
      });
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (!reply)
      return res.status(500).json({ error: "Malformed OpenAI response" });

    return res.status(200).json({ type: "text", reply });
  } catch (err) {
    console.error("Handler Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
