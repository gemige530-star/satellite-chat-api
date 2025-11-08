// api/graph.js

const fs = require("fs");
const path = require("path");

// 读取根目录下的 JSON 数据集
const datasetPath = path.join(__dirname, "..", "satellite_art.json");
const artworks = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));

// Serverless 函数入口
module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  // 从请求中取出 prompt（如果你前端要用自然语言输入）
  let prompt = "";
  try {
    const body = JSON.parse(req.body || "{}");
    prompt = body.prompt || "";
  } catch (e) {}

  // 如果 prompt 含有 “country” 或 “国家”，就生成国家—轨道关系图
  const isCountryGraph =
    /country|国家/i.test(prompt) || /国/.test(prompt);

  const graph_spec = isCountryGraph
    ? buildCountryOrbitGraph(artworks)
    : buildOrbitTotalGraph(artworks);

  res.end(JSON.stringify({ graph_spec }));
};

// 地球—轨道图
function buildOrbitTotalGraph(records) {
  const orbitCount = {};
  for (const r of records) {
    const orbit = (r.Spatial_Location || "Unknown").trim();
    orbitCount[orbit] = (orbitCount[orbit] || 0) + 1;
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

// 国家—轨道图
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
