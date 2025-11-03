export default async function handler(req, res) {
  // ✅ 1. 允许跨域访问（加在最前面）
  res.setHeader("Access-Control-Allow-Origin", "https://satelliteartarchive.dpdns.org");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // ✅ 2. 处理浏览器的预检请求（OPTIONS）
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ✅ 3. 你的原逻辑
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body || (await req.json?.());
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: message }],
      }),
    });

    const data = await response.json();
    return res.status(200).json({ reply: data.choices[0].message.content });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
