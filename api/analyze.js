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

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);

      return res.status(500).json({
        error: "Gemini API request failed",
        details: data
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({
        error: "Gemini returned an empty response"
      });
    }

    const result = JSON.parse(text);

    return res.status(200).json(result);

  } catch (error) {
    console.error("Analyze error:", error);

    return res.status(500).json({
      error: "Analysis failed",
      message: error.message
    });
  }
}
