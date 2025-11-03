export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://satelliteartarchive.dpdns.org");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body ?? (await req.json?.());
    const message = body?.message;
    if (!message) return res.status(400).json({ error: "Missing 'message' in request body" });

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

    if (!response.ok) {
      console.error("OpenAI API Error:", data);
      return res.status(response.status).json({ error: data.error?.message || "OpenAI request failed" });
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
      console.error("Unexpected OpenAI response:", data);
      return res.status(500).json({ error: "Malformed OpenAI response" });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Handler Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
