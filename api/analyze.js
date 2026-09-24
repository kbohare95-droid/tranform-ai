export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { sourceContent, sourceType, userSettings } = req.body || {};

    if (!sourceContent) {
      return res.status(400).json({ error: "Source content is required" });
    }

    const prompt = `
Analyze the following content for a content transformation platform.

Source type: ${sourceType || "unknown"}

User settings:
${JSON.stringify(userSettings || {}, null, 2)}

Content:
${sourceContent}

Return ONLY valid JSON in exactly this structure:

{
  "contentType": "string",
  "topic": "string",
  "intent": "string",
  "audience": "string",
  "themes": ["string"],
  "confidence": 0,
  "sensitive": [],
  "summary": "string"
}

Rules:
- confidence must be a number from 0 to 100.
- themes must be an array of strings.
- sensitive must be an array.
- Do not use markdown.
- Do not add anything outside the JSON.
`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL,
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Claude API error:", data);
      return res.status(500).json({
        error: "Claude API request failed",
        details: data
      });
    }

    const text = data?.content?.[0]?.text;

    if (!text) {
      return res.status(500).json({
        error: "Claude returned an empty response"
      });
    }

    const cleanText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const result = JSON.parse(cleanText);

    return res.status(200).json(result);

  } catch (error) {
    console.error("Analyze error:", error);

    return res.status(500).json({
      error: "Analysis failed",
      message: error.message
    });
  }
}
