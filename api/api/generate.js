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
      settings,
      selectedOutputs
    } = req.body || {};

    if (!sourceContent) {
      return res.status(400).json({
        error: "Source content is required"
      });
    }

    if (!Array.isArray(selectedOutputs) || selectedOutputs.length === 0) {
      return res.status(400).json({
        error: "At least one output must be selected"
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured"
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

    const outputNames = {
      exec: "Executive Summary",
      adv: "Security Advisory",
      li: "LinkedIn Post",
      x: "X/Twitter Thread",
      vid: "Video Package",
      inf: "Infographic",
      ppt: "Presentation",
      mail: "Email",
      faq: "FAQ",
      pr: "Press Release",
      inc: "Incident Report"
    };

    const prompt = `
You are TransformAI, an AI content transformation engine.

Your task is to transform ONE source into MULTIPLE requested content formats.

SOURCE CONTENT:
${sourceContent}

SOURCE ANALYSIS:
${JSON.stringify(analysis || {}, null, 2)}

USER SETTINGS:
${JSON.stringify(settings || {}, null, 2)}

REQUESTED OUTPUT IDS:
${JSON.stringify(selectedOutputs)}

IMPORTANT FACTUAL RULES:
- Use only information supported by the source.
- Do NOT invent statistics.
- Do NOT invent names.
- Do NOT invent dates.
- Do NOT invent quotes.
- Do NOT invent organizations.
- Do NOT invent events.
- Do NOT present assumptions as facts.
- If information is unavailable, say that it is not provided in the source.
- Follow the requested language, audience, tone, detail, objective and style.

OUTPUT TYPES:

exec = Executive Summary
adv = Security Advisory
li = LinkedIn Post
x = X/Twitter Thread
vid = Video Package
inf = Infographic
ppt = Presentation
mail = Email
faq = FAQ
pr = Press Release
inc = Incident Report

FORMAT RULES:

Return ONLY a valid JSON array.

Return EXACTLY ONE object for EVERY requested output ID.

The number of returned objects MUST equal the number of requested output IDs.

Each object MUST have this structure:

{
  "id": "exec",
  "title": "Generated title",
  "sections": [
    ["Section name", "Section content"]
  ]
}

Rules:
- "id" must exactly match a requested output ID.
- Never invent an ID.
- "title" must be a string.
- "sections" must always be an array.
- Every section must contain exactly two strings.
- Do not use markdown.
- Do not use HTML.
- Do not add explanations outside the JSON.

FORMAT-SPECIFIC RULES:

For exec:
Create sections such as Overview, Key Findings, Important Information and Recommendations when supported.

For adv:
Create sections such as Severity, Affected Area, Summary, Impact, Indicators, Mitigation and Recommended Actions when supported.

For li:
Create a strong professional LinkedIn post with sections such as Hook, Post Body, Key Points and Hashtags.

For x:
Create a thread using multiple sections:
Post 1, Post 2, Post 3, Post 4, Post 5.
Keep each post concise.

For vid:
Include sections such as:
Video Title
Duration
Script
Scene Breakdown
Narration
Visual Recommendations
Subtitles

For inf:
Create concise information/statistic sections suitable for an infographic.

For ppt:
Create multiple sections:
Slide 1
Slide 2
Slide 3
Slide 4
Slide 5

For mail:
Create sections such as:
Subject
Body
Sign-off

For faq:
Create multiple question-and-answer sections.

For pr:
Create sections such as:
Headline
Body
Key Information
Contact

For inc:
Create professional incident/operational sections such as:
Incident
Severity
Timeline
Impact
Actions
Status
Only include information supported by the source.

Generate ALL requested outputs now.
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

    let text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({
        error: "Gemini returned an empty response"
      });
    }

    text = text.trim();

    // Remove accidental markdown JSON fences
    if (text.startsWith("```")) {
      text = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
    }

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      console.error("Gemini JSON parse error:", parseError);
      console.error("Gemini raw response:", text);

      return res.status(500).json({
        error: "Gemini returned invalid JSON"
      });
    }

    if (!Array.isArray(parsed)) {
      return res.status(500).json({
        error: "Invalid generation response"
      });
    }

    const generatedMap = new Map();

    for (const item of parsed) {
      if (!item || !selectedOutputs.includes(item.id)) {
        continue;
      }

      let sections = [];

      if (Array.isArray(item.sections)) {
        sections = item.sections
          .filter(
            section =>
              Array.isArray(section) &&
              section.length >= 2
          )
          .map(section => [
            String(section[0]),
            String(section[1])
          ]);
      }

      if (sections.length === 0) {
        sections = [
          [
            "Generated Content",
            "No structured content was returned for this format."
          ]
        ];
      }

      generatedMap.set(item.id, {
        id: item.id,
        title:
          typeof item.title === "string" && item.title.trim()
            ? item.title
            : outputNames[item.id] || "Generated Output",
        group: outputGroups[item.id] || "Summary",
        vis: item.id === "inf",
        sections
      });
    }

    // Guarantee that every selected output is returned.
    const results = selectedOutputs.map(id => {
      if (generatedMap.has(id)) {
        return generatedMap.get(id);
      }

      return {
        id,
        title: outputNames[id] || "Generated Output",
        group: outputGroups[id] || "Summary",
        vis: id === "inf",
        sections: [
          [
            "Generated Content",
            "The AI did not return structured content for this format."
          ]
        ]
      };
    });

    return res.status(200).json(results);

  } catch (error) {
    console.error("Generation error:", error);

    return res.status(500).json({
      error: "Content generation failed",
      message: error.message
    });
  }
}
