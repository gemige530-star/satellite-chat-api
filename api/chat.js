// api/chat.js

const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const datasetPath = path.join(__dirname, "..", "satellite_art.json");
const artworks = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));

// 辅助：构建轨道分布图
function buildOrbitTotalGraph(records) {
  const orbitCount = {};
  for (const r of records) {
    const o = (r.Spatial_Location || "Unknown").trim();
    orbitCount[o] = (orbitCount[o] || 0) + 1;
  }

  const nodes = Object.entries(orbitCount).map(([orbit, count]) => ({
    id: orbit,
    label: orbit,
    category: "orbit",
    count
  }));

  nodes.push({
    id: "Earth",
    label: "Earth",
    category: "center",
    count: records.length
  });

  const edges = Object.entries(orbitCount).map(([orbit, count]) => ({
    source: "Earth",
    target: orbit,
    weight: count,
    label: `${count} artworks`
  }));

  return { graph_type: "orbit_total", nodes, edges };
}

// 辅助：构建国家-轨道关系图
function buildCountryOrbitGraph(records) {
  const pairs = {};
  const countryCount = {};
  const orbitCount = {};

  for (const r of records) {
    const c = (r.Country || "Unknown").trim();
    const o = (r.Spatial_Location || "Unknown").trim();

    countryCount[c] = (countryCount[c] || 0) + 1;
    orbitCount[o] = (orbitCount[o] || 0) + 1;

    const key = `${c}:::${o}`;
    pairs[key] = (pairs[key] || 0) + 1;
  }

  const nodes = [
    ...Object.entries(countryCount).map(([country, count]) => ({
      id: `C:${country}`,
      label: country,
      category: "country",
      count
    })),
    ...Object.entries(orbitCount).map(([orbit, count]) => ({
      id: `O:${orbit}`,
      label: orbit,
      category: "orbit",
      count
    }))
  ];

  const edges = Object.entries(pairs).map(([key, weight]) => {
    const [country, orbit] = key.split(":::");
    return {
      source: `C:${country}`,
      target: `O:${orbit}`,
      weight,
      label: `${weight} artworks`
    };
  });

  return { graph_type: "country_orbit", nodes, edges };
}

// 主入口：给前端聊天窗口用
module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Only POST allowed" }));
    return;
  }

  let body;
  try {
    body = JSON.parse(req.body || "{}");
  } catch (e) {
    body = {};
  }

  const userMessage = (body.message || "").trim();

  // 1. 如果是要关系图：用本地数据生成 graph_spec，返回给前端
  const wantGraph =
    /graph/i.test(userMessage) ||
    /关系图/.test(userMessage) ||
    /orbit distribution/i.test(userMessage) ||
    /轨道分布/.test(userMessage);

  if (wantGraph) {
    const wantCountry =
      /country/i.test(userMessage) || /国家/.test(userMessage);

    const graph_spec = wantCountry
      ? buildCountryOrbitGraph(artworks)
      : buildOrbitTotalGraph(artworks);

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        type: "graph",
        graph_spec
      })
    );
    return;
  }

  // 2. 否则正常走 GPT-4o 文本聊天
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are the Satellite Art Archive Assistant for satelliteartarchive.dpdns.org. " +
            "Use accurate, concise English. Do not invent artworks outside the archive when answering factual questions."
        },
        { role: "user", content: userMessage }
      ]
    });

    const reply =
      completion.choices[0]?.message?.content ||
      "Sorry, no response.";

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        type: "text",
        message: reply
      })
    );
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end(
      JSON.stringify({
        type: "text",
        message: "Error contacting model."
      })
    );
  }
};
