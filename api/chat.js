export default async function handler(req, res) {
  // 允许跨域
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

    // 自动检测是否为中文
    const isChinese = /[\u4e00-\u9fa5]/.test(message);

    // 定义两种风格提示
    const chineseSystemPrompt =
      "你是一位理性、简洁、自然流畅又富于生气的中文学者，用平实但有思想的语言表达，不要使用模板化或客套语气。";

    const englishSystemPrompt =
      "You are a rational, concise, and eloquent scholar. Write in natural, vivid English that is thoughtful yet unpretentious.";

    // 调用 OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o", // 建议使用正式版而非 mini，风格更自然
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
