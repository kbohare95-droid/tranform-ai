export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      sourceContent,
      analysis,
      settings,
      selectedOutputs
    } = req.body || {};

    if (!sourceContent) {
      return res.status(400).json({
        error: "Source content is required"
      });
    }

    const prompt = `
You are the content generation engine of TransformAI.

Generate professional content from the supplied source.

SOURCE:
${sourceContent}

AI ANALYSIS:
${JSON.stringify(analysis || {}, null, 2)}

USER SETTINGS:
${JSON.stringify(settings || {}, null, 2)}

SELECTED OUTPUT TYPES:
${JSON.stringify(selectedOutputs || [], null, 2)}

Generate one output for EACH selected output type.

Return ONLY valid JSON as an array.

Each object MUST follow this structure:

{
  "id": "unique-short-id",
  "title": "Output title",
  "group": "Output category",
  "sections": [
    ["Section name", "Section content"]
  ]
}

Rules:
- Preserve the important facts from the source.
- Do not invent statistics, names, dates, quotations, or claims.
- Adapt the language to the requested audience, tone, language, detail and objective.
- Make each output genuinely different according to its format.
- Keep government/cybersecurity communication professional when applicable.
- Return ONLY JSON.
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
            temperature: 0.4,
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

    const results = JSON.parse(text);

    if (!Array.isArray(results)) {
      return res.status(500).json({
        error: "Gemini returned an invalid output format"
      });
    }

    return res.status(200).json(results);

  } catch (error) {
    console.error("Generation error:", error);

    return res.status(500).json({
      error: "Content generation failed",
      message: error.message
    });
  }
}
