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

    const outputGroups = {
      exec: "Summary",
      adv: "Advisory",
      li: "Social",
      x: "Social",
      vid: "Video",
      inf: "Infographic",
      ppt: "Presentation",
      mail: "Summary",
      faq: "Summary",
      pr: "Summary",
      inc: "Advisory"
    };

    const prompt = `
You are TransformAI, an AI content transformation engine.

Transform the source content into the requested output formats.

SOURCE CONTENT:
${sourceContent}

SOURCE ANALYSIS:
${JSON.stringify(analysis || {}, null, 2)}

USER SETTINGS:
${JSON.stringify(settings || {}, null, 2)}

REQUESTED OUTPUTS:
${JSON.stringify(selectedOutputs || [], null, 2)}

Return ONLY valid JSON.

The response MUST be an array.

Each array item MUST have exactly this structure:

{
  "id": "exec",
  "title": "Generated title",
  "sections": [
    ["Section name", "Section content"]
  ]
}

IMPORTANT:
- The "id" MUST exactly match one of the requested output IDs.
- Do not invent output IDs.
- "sections" MUST always be an array.
- Every section MUST be exactly a two-item array:
  ["label", "content"]
- Do not return markdown.
- Do not return HTML.
- Do not return explanations outside the JSON.
- Preserve facts from the source.
- Do NOT invent statistics, names, dates, quotes or unsupported claims.
- Follow the requested audience, tone, language, detail, objective and style.
- Make each output appropriate for its specific format.

Output-specific instructions:

exec = Executive Summary
adv = Security Advisory
li = LinkedIn post
x = X/Twitter thread
vid = Video package
inf = Infographic content
ppt = Presentation slides
mail = Email
faq = FAQ
pr = Press Release
inc = Incident Report

For x:
Create multiple sections such as Post 1, Post 2, Post 3.

For ppt:
Create sections such as Slide 1, Slide 2, Slide 3.

For inf:
Create concise statistic/information sections.

For vid:
Include title, duration, script, scene breakdown and narration where appropriate.

For faq:
Create multiple question-and-answer sections.

For adv and inc:
Use professional security/operational terminology when supported by the source.
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

    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) {
      return res.status(500).json({
        error: "Invalid generation response"
      });
    }

    const results = parsed
      .filter(item => selectedOutputs.includes(item.id))
      .map(item => ({
        id: item.id,
        title: item.title || "Generated Output",
        group: outputGroups[item.id] || "Summary",
        vis: item.id === "inf",
        sections: Array.isArray(item.sections)
          ? item.sections
              .filter(section =>
                Array.isArray(section) &&
                section.length >= 2
              )
              .map(section => [
                String(section[0]),
                String(section[1])
              ])
          : []
      }));

    return res.status(200).json(results);

  } catch (error) {
    console.error("Generation error:", error);

    return res.status(500).json({
      error: "Content generation failed",
      message: error.message
    });
  }
}
