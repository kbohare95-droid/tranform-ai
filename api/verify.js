export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const {
      sourceContent,
      analysis,
      outputs
    } = req.body || {};

    if (!outputs || !Array.isArray(outputs)) {
      return res.status(400).json({
        error: "Outputs are required"
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured"
      });
    }

    const prompt = `
You are TransformAI's AI quality verification engine.

Compare the generated outputs with the original source and
evaluate their quality and factual consistency.

ORIGINAL SOURCE:
${sourceContent || "Not provided"}

SOURCE ANALYSIS:
${JSON.stringify(analysis || {}, null, 2)}

GENERATED OUTPUTS:
${JSON.stringify(outputs, null, 2)}

Evaluate:

1. Consistency
Does the generated content remain consistent with the source?

2. Coverage
Does it preserve the important information from the source?

3. Readability
Is it clear, professional and understandable?

4. Unsupported claims
Identify claims, statistics, names, dates or facts that are
not supported by the source.

5. Issues
Identify specific problems that should be corrected.

SCORING:

Return scores from 0 to 100.

consistency = factual consistency with source
coverage = important source information preserved
readability = clarity and professional quality
overall = overall quality

Be critical but fair.

Do not invent verification findings.

If something cannot be verified from the source, mention it
as an uncertainty instead of assuming it is true.

Return ONLY valid JSON.

FORMAT:

{
  "consistency": 0,
  "coverage": 0,
  "readability": 0,
  "overall": 0,
  "unsupported": [],
  "issues": []
}
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" +
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
      console.error("Gemini verification error:", data);

      throw new Error(
        data?.error?.message ||
        "Gemini verification request failed"
      );
    }

    let text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error(
        "Gemini returned an empty response"
      );
    }

    text = text.trim();

    if (text.startsWith("```")) {
      text = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
    }

    let result;

    try {
      result = JSON.parse(text);
    } catch (error) {
      console.error(
        "Verification JSON parse error:",
        text
      );

      throw new Error(
        "Gemini returned invalid JSON"
      );
    }

    function score(value) {
      const n = Number(value);

      if (!Number.isFinite(n)) {
        return 0;
      }

      return Math.max(
        0,
        Math.min(100, Math.round(n))
      );
    }

    const finalResult = {
      consistency: score(result.consistency),
      coverage: score(result.coverage),
      readability: score(result.readability),
      overall: score(result.overall),

      unsupported: Array.isArray(result.unsupported)
        ? result.unsupported.map(String)
        : [],

      issues: Array.isArray(result.issues)
        ? result.issues.map(String)
        : []
    };

    return res.status(200).json(finalResult);

  } catch (error) {
    console.error(
      "Verification error:",
      error
    );

    return res.status(500).json({
      error: "Content verification failed",
      message: error.message
    });
  }
}
