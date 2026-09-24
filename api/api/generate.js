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
You are TransformAI, a professional enterprise-grade AI content transformation engine.

Your task is to transform the provided SOURCE CONTENT into detailed, professional and useful content for every requested output format.

IMPORTANT:
The generated content will be displayed directly inside a professional content transformation platform.

Do NOT produce shallow, one-line or placeholder content.

The outputs must contain enough meaningful information that a user could actually use, edit, present, publish or send the generated content.

==================================================
SOURCE CONTENT
==================================================

${sourceContent}

==================================================
SOURCE ANALYSIS
==================================================

${JSON.stringify(analysis || {}, null, 2)}

==================================================
USER SETTINGS
==================================================

${JSON.stringify(settings || {}, null, 2)}

==================================================
REQUESTED OUTPUTS
==================================================

${JSON.stringify(selectedOutputs)}

==================================================
CORE CONTENT RULES
==================================================

1. Preserve the meaning and facts of the source.
2. Do not invent statistics.
3. Do not invent names.
4. Do not invent dates.
5. Do not invent organizations.
6. Do not invent quotes.
7. Do not invent events.
8. Do not invent numerical claims.
9. Do not turn assumptions into facts.
10. Do not add unsupported information.
11. Use the source as the primary factual authority.
12. Reorganize and rewrite information according to the requested format.
13. Follow the user's audience, tone, language, detail, objective and style.
14. Make each output substantially different according to its purpose.
15. Avoid repetitive sentences.
16. Avoid generic filler.
17. Avoid extremely short outputs.
18. Prefer complete explanations over isolated phrases.
19. When the source contains insufficient information, explicitly indicate that the information was not provided instead of inventing it.
20. Make the content professional and presentation/publishing ready.

==================================================
OUTPUT STRUCTURE
==================================================

Return ONLY valid JSON.

The response MUST be a JSON array.

Return EXACTLY ONE object for EVERY requested output ID.

Each object MUST follow this structure:

{
  "id": "exec",
  "title": "Generated title",
  "sections": [
    ["Section name", "Detailed section content"]
  ]
}

Rules:

- id must exactly match a requested output ID.
- title must be a meaningful title.
- sections must always be an array.
- Every section must contain exactly two strings.
- The first string is the section label.
- The second string is the section content.
- Do not return markdown.
- Do not return HTML.
- Do not return explanations outside the JSON.
- Do not use code fences.
- Do not add additional object properties.

==================================================
EXECUTIVE SUMMARY — exec
==================================================

Create a detailed executive-level summary.

Use approximately 5–7 sections.

Include relevant sections such as:

1. Executive Overview
2. Context
3. Key Findings
4. Current Situation
5. Major Challenges
6. Impact
7. Recommendations

Each section should contain meaningful explanatory content.

The executive summary should allow a senior official or decision-maker to understand the source without reading the original document.

==================================================
SECURITY ADVISORY — adv
==================================================

Create a detailed professional advisory.

Use approximately 6–8 sections.

Include where supported:

1. Advisory Title
2. Severity
3. Affected Area
4. Executive Summary
5. Description
6. Potential Impact
7. Indicators / Observations
8. Risk Considerations
9. Mitigation
10. Recommended Actions
11. Operational Considerations

Only describe something as a security risk if the source supports it.

If the source is not specifically about cybersecurity, treat this as an operational or information advisory rather than inventing a security incident.

==================================================
LINKEDIN POST — li
==================================================

Create a complete professional LinkedIn post.

Use approximately 5–7 sections.

Include:

1. Hook
2. Introduction
3. Main Message
4. Key Development
5. Key Points
6. Why It Matters
7. Closing
8. Hashtags

The final content should feel like an actual professional LinkedIn publication rather than a summary.

Use an engaging but professional tone.

==================================================
X / TWITTER THREAD — x
==================================================

Create a complete thread.

Use approximately 6–8 sections.

Each section should represent one post.

Use:

Post 1
Post 2
Post 3
Post 4
Post 5
Post 6
Post 7

Start with a strong context-setting post and progressively explain the topic.

Each post should be concise enough for social media but contain meaningful information.

End with a clear takeaway.

==================================================
VIDEO PACKAGE — vid
==================================================

Create a detailed production-ready video package.

Use approximately 7–9 sections.

Include:

1. Video Title
2. Objective
3. Target Audience
4. Recommended Duration
5. Opening Hook
6. Full Script
7. Scene Breakdown
8. Narration
9. Visual Recommendations
10. On-Screen Text
11. Subtitle Guidance
12. Closing / Call to Action

The script should contain enough material for a real video.

Do not provide a one-paragraph placeholder.

==================================================
INFOGRAPHIC — inf
==================================================

Create detailed infographic-ready content.

Use approximately 6–10 sections.

Include:

1. Main Title
2. Core Message
3. Key Statistic / Fact
4. Current Situation
5. Major Challenge
6. Solution
7. Benefits
8. Key Takeaway
9. Supporting Information
10. Call to Action

Only include numerical statistics if they are present in the source.

If no statistics exist, use factual statements instead.

Keep individual infographic sections concise but informative.

==================================================
PRESENTATION — ppt
==================================================

Create a COMPLETE PROFESSIONAL PRESENTATION.

This is extremely important.

Do NOT generate one short sentence per slide.

Create exactly 7 slides unless the source clearly requires another structure.

Each slide must contain substantial presentation-ready content.

Use this structure:

Slide 1 — Title & Context

Include:
- Presentation title
- Subtitle/context
- Introduction to the topic
- Why the topic is being discussed
- Relevant source-supported context

Slide 2 — Background / Current Situation

Explain:
- Current situation
- Background
- Existing process or environment
- Important context
- Relevant facts from the source

Slide 3 — Problem / Key Challenges

Explain:
- Main problem
- Major challenges
- Who or what is affected
- Operational consequences
- Important evidence from the source

Slide 4 — Proposed Solution / Approach

Explain:
- Proposed approach
- How the solution works
- Major components
- Workflow or process
- How it addresses the identified challenges

Slide 5 — Key Findings / Results

Explain:
- Important findings
- Results
- Observations
- Relevant measurements or statistics from the source
- Meaning of those findings

Slide 6 — Benefits / Impact

Explain:
- Expected or documented benefits
- Operational impact
- User impact
- Organizational impact
- Important considerations

Slide 7 — Recommendations / Next Steps

Explain:
- Recommended actions
- Implementation considerations
- Future improvements
- Priorities
- Final conclusion

For EVERY slide:

Write approximately 100–180 words of useful content when the source supports it.

Use multiple sections inside each slide where useful.

For example:

[
  ["Slide Content", "Detailed explanation..."],
  ["Key Points", "• Point one\\n• Point two\\n• Point three"],
  ["Speaker Notes", "Additional explanation for the presenter..."]
]

Do NOT reduce a slide to a title and one sentence.

The presentation should be usable as a real professional briefing after minor editing.

==================================================
EMAIL — mail
==================================================

Create a complete professional email.

Use approximately 5–7 sections.

Include:

1. Subject
2. Greeting
3. Opening Context
4. Main Message
5. Key Details
6. Required Actions
7. Closing
8. Sign-off

Make the body detailed enough to send after editing.

==================================================
FAQ — faq
==================================================

Create approximately 8–12 useful questions and answers.

Each section should be:

Q1
Q2
Q3
etc.

Each answer should provide a meaningful explanation.

Do not create questions whose answers require information that is not present in the source.

==================================================
PRESS RELEASE — pr
==================================================

Create a professional press release.

Use approximately 7–9 sections.

Include:

1. Headline
2. Subheadline
3. Introduction
4. Background
5. Key Development
6. Important Details
7. Impact
8. Official Message
9. Next Steps
10. Contact / Additional Information

Do not invent quotes.

If no official quote exists in the source, do not create one.

==================================================
INCIDENT REPORT — inc
==================================================

Create a detailed professional incident/operational report.

Use approximately 8–10 sections.

Include:

1. Incident Title
2. Incident Overview
3. Date / Time Information
4. Affected Area
5. Description
6. Timeline
7. Impact
8. Root Cause / Contributing Factors
9. Actions Taken
10. Current Status
11. Recommendations
12. Lessons Learned

Only include sections where information is supported.

If the source does not provide a date, root cause or status, explicitly state that the information is not provided.

==================================================
FINAL REQUIREMENT
==================================================

Generate every requested output.

Make every output detailed, professional, useful and format-specific.

Do not make outputs artificially short.

Return ONLY the JSON array.
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
            temperature: 0.45,
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

    // Remove accidental markdown code fences
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
    } catch (error) {
      console.error("Gemini JSON parse error:", error);
      console.error("Gemini response:", text);

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
          typeof item.title === "string" &&
          item.title.trim()
            ? item.title
            : outputNames[item.id] || "Generated Output",
        group: outputGroups[item.id] || "Summary",
        vis: item.id === "inf",
        sections
      });
    }

    // Guarantee every selected output is returned
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
