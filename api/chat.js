import fs from "fs/promises";

export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    // ✅ 把 JSON 加载移到函数内部
    const raw = await fs.readFile("./satellite_art.json", "utf-8");
    const satelliteData = JSON.parse(raw);

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

  // ✅ 从 satellite_art.json 生成语义网络
graph_type = "semantic_art";
nodes = [];
edges = [];

for (const item of satelliteData) {
  const artNode = { id: item.name, label: item.name, category: "art", group: 1 };
  nodes.push(artNode);

  if (item.artist) {
    const artistNode = { id: item.artist, label: item.artist, category: "artist", group: 2 };
    if (!nodes.find(n => n.id === artistNode.id)) nodes.push(artistNode);
    edges.push({ source: item.artist, target: item.name, weight: 1 });
  }

  if (item.country) {
    const countryNode = { id: item.country, label: item.country, category: "country", group: 3 };
    if (!nodes.find(n => n.id === countryNode.id)) nodes.push(countryNode);
    edges.push({ source: item.name, target: item.country, weight: 0.8 });
  }

  if (item.year) {
    const yearNode = { id: item.year, label: item.year.toString(), category: "year", group: 4 };
    if (!nodes.find(n => n.id === yearNode.id)) nodes.push(yearNode);
    edges.push({ source: item.name, target: item.year.toString(), weight: 0.5 });
  }
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
