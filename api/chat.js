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
 if (
  /\bwhat\s+is\s+satellite\s*art\b/i.test(prompt) ||
  /\bdefine\s+satellite\s*art\b/i.test(prompt) ||
  /\bdefinition\s+of\s+satellite\s*art\b/i.test(prompt) ||
  /\bsatellite\s*art\b/i.test(prompt) ||
  /卫星艺术/.test(prompt)
)

 {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.2,
      prompt: {
        id: "pmpt_6911cbdb43b0819090d2abc414797f100eefc3899a868814",
        version: "7", // ✅ 最新版
      },
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
          ],
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Prompt API Error:", data);
    return res.status(500).json({ error: "Failed to fetch definition" });
  }

  let reply = "";
  if (data.output?.[0]?.content?.[0]?.text) {
    reply = data.output[0].content[0].text.trim();
  } else if (data.output_text) {
    reply = data.output_text.trim();
  } else {
    console.error("Unexpected responses format:", JSON.stringify(data, null, 2));
    reply =
      "Satellite art generally refers to artistic practices associated with outer space orbits, space stations, and artistic activities conducted on the Moon.";
  }

  return res.status(200).json({ type: "text", reply });
}

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

    // ✅ 逻辑2：普通文字回复（改为使用 Responses + Prompt ID）
const response = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  },
  body: JSON.stringify({
    model: "gpt-4o",
    temperature: 0.8,
    top_p: 0.9,
    prompt: {
      id: "pmpt_69123efac68481979eef9ff79ac36fe90c97666440d936cb",
      version: "1", // ✅ 使用你自己的 prompt 版本
    },
    input: [
      {
        role: "user",
        content: [{ type: "input_text", text: prompt }],
      },
    ],
  }),
});

const data = await response.json();

if (!response.ok) {
  console.error("Prompt API Error:", data);
  return res.status(500).json({ error: "Failed to fetch prompt response" });
}

let reply = "";
if (data.output?.[0]?.content?.[0]?.text) {
  reply = data.output[0].content[0].text.trim();
} else if (data.output_text) {
  reply = data.output_text.trim();
} else {
  console.error("Unexpected response format:", JSON.stringify(data, null, 2));
  reply = "Sorry, I couldn’t generate a response.";
}

return res.status(200).json({ type: "text", reply });
