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

    async function callGemini(prompt, temperature = 0.35) {
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
              temperature,
              responseMimeType: "application/json"
            }
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Gemini API error:", data);

        throw new Error(
          data?.error?.message ||
          "Gemini API request failed"
        );
      }

      let text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error("Gemini returned an empty response");
      }

      text = text.trim();

      if (text.startsWith("```")) {
        text = text
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
      }

      try {
        return JSON.parse(text);
      } catch (error) {
        console.error("Gemini JSON parse error:", text);
        throw new Error("Gemini returned invalid JSON");
      }
    }

    /*
    ==========================================================
    DEDICATED PRESENTATION GENERATION
    ==========================================================
    */

    async function generatePresentation() {
      const presentationPrompt = `
You are TransformAI's dedicated professional presentation generator.

You are NOT generating social media content.
You are NOT generating a short summary.
You are NOT generating a simple outline.

You are generating a COMPLETE professional presentation that can
be presented to an audience after minor editing.

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
OBJECTIVE
==================================================

Create a detailed 8-slide professional presentation.

The presentation should explain the subject logically from
beginning to end.

The audience should be able to understand:

- What the topic is
- Why it matters
- What the current situation is
- What problems exist
- What solution or approach is being discussed
- How it works
- What evidence or findings exist
- What impact or benefits exist
- What should happen next

==================================================
VERY IMPORTANT
==================================================

DO NOT create short slide summaries.

Each slide must contain substantial information.

Every slide must contain:

1. Slide Content
2. Key Points
3. Supporting Details
4. Speaker Notes

You may add additional sections where useful.

The presentation should contain enough material for approximately
8–12 minutes of professional speaking.

Do not artificially repeat information.

Expand information by explaining and organizing the source,
NOT by inventing facts.

==================================================
FACTUAL RULES
==================================================

- Use ONLY information supported by the source and analysis.
- Do not invent statistics.
- Do not invent names.
- Do not invent dates.
- Do not invent organizations.
- Do not invent quotes.
- Do not invent results.
- Do not invent technical capabilities.
- Do not turn expected benefits into achieved results.
- Clearly distinguish documented facts from recommendations.
- If information is missing, write:
  "Not specified in the source."

==================================================
SLIDE 1 — TITLE AND CONTEXT
==================================================

Sections:

Title
Subtitle
Slide Content
Key Points
Context
Why This Topic Matters
Speaker Notes

Slide Content should explain the subject in approximately
100–150 words.

Key Points should contain 4–6 meaningful points.

Speaker Notes should contain approximately 80–120 words.

==================================================
SLIDE 2 — BACKGROUND AND CURRENT SITUATION
==================================================

Sections:

Slide Content
Background
Current Situation
Important Facts
Key Points
Supporting Details
Speaker Notes

Explain the environment and context in detail.

Slide Content:
approximately 100–150 words.

Supporting Details:
4–7 detailed points.

Speaker Notes:
approximately 80–120 words.

==================================================
SLIDE 3 — PROBLEM AND CHALLENGES
==================================================

Sections:

Problem Overview
Major Challenges
Affected Stakeholders
Operational Impact
Evidence From Source
Key Points
Speaker Notes

Clearly explain:

- What the problem is
- Why it exists
- Who is affected
- What consequences it creates
- What evidence exists

Do not invent causes that are not supported.

==================================================
SLIDE 4 — PROPOSED SOLUTION / APPROACH
==================================================

Sections:

Solution Overview
How It Works
Major Components
Process / Workflow
Problem-Solution Mapping
Key Benefits
Speaker Notes

Explain the solution step by step.

Do not simply list features.

For every important component, explain what it does
and how it contributes to the overall approach.

==================================================
SLIDE 5 — IMPLEMENTATION / SYSTEM / PROCESS
==================================================

Sections:

Implementation Approach
Core Components
User Flow
Operational Workflow
Technology / Process Considerations
Important Requirements
Speaker Notes

Explain how the solution could operate based on the source.

If technical details are not provided, do not invent them.

==================================================
SLIDE 6 — FINDINGS / RESULTS / EVIDENCE
==================================================

Sections:

Key Findings
Important Data
Evidence
Observations
Interpretation
Key Takeaways
Speaker Notes

Use actual numbers only if they exist in the source.

Explain what each important finding means.

Do not fabricate results.

==================================================
SLIDE 7 — IMPACT AND BENEFITS
==================================================

Sections:

User Impact
Operational Benefits
Organizational Benefits
Expected Benefits
Documented Benefits
Important Considerations
Speaker Notes

Clearly distinguish:

Documented results

from

Expected or proposed benefits.

Do not present proposed benefits as already achieved.

==================================================
SLIDE 8 — RECOMMENDATIONS AND CONCLUSION
==================================================

Sections:

Key Recommendations
Priority Actions
Implementation Considerations
Future Scope
Key Takeaway
Final Conclusion
Speaker Notes

Create a strong professional closing.

Summarize the main message and explain the logical next steps
supported by the source.

==================================================
CONTENT LENGTH
==================================================

For EACH slide:

Slide Content:
80–150 words.

Key Points:
4–6 meaningful points.

Supporting Details:
4–7 detailed points or explanations.

Speaker Notes:
80–120 words.

Additional sections:
Use when they improve the presentation.

Do NOT make sections one-line placeholders.

==================================================
OUTPUT FORMAT
==================================================

Return ONLY valid JSON.

Return exactly:

[
  {
    "id": "ppt",
    "title": "Presentation title",
    "sections": [
      ["Slide 1 — Title", "Presentation title"],
      ["Subtitle", "Subtitle text"],
      ["Slide Content", "Detailed content..."],
      ["Key Points", "• Point 1\\n• Point 2\\n• Point 3\\n• Point 4"],
      ["Context", "Detailed context..."],
      ["Why This Topic Matters", "Detailed explanation..."],
      ["Speaker Notes", "Detailed presenter notes..."],

      ["Slide 2 — Background", "Background"],
      ["Slide Content", "Detailed content..."],
      ["Background", "Detailed explanation..."],
      ["Current Situation", "Detailed explanation..."],
      ["Important Facts", "Detailed information..."],
      ["Key Points", "• Point 1\\n• Point 2\\n• Point 3"],
      ["Speaker Notes", "Detailed presenter notes..."]
    ]
  }
]

IMPORTANT:

All 8 slides must be represented inside the sections array.

Use labels such as:

Slide 1 — Title
Slide 2 — Background
Slide 3 — Problem
Slide 4 — Solution
Slide 5 — Implementation
Slide 6 — Findings
Slide 7 — Impact
Slide 8 — Conclusion

Return ONLY the JSON array.
`;

      const result = await callGemini(
        presentationPrompt,
        0.3
      );

      if (!Array.isArray(result) || !result.length) {
        throw new Error(
          "Presentation generation returned invalid data"
        );
      }

      const item = result[0];

      const sections = Array.isArray(item.sections)
        ? item.sections
            .filter(
              section =>
                Array.isArray(section) &&
                section.length >= 2
            )
            .map(section => [
              String(section[0]),
              String(section[1])
            ])
        : [];

      return {
        id: "ppt",
        title:
          item.title ||
          "Professional Presentation",
        group: "Presentation",
        vis: false,
        sections
      };
    }

    /*
    ==========================================================
    NORMAL OUTPUT GENERATION
    ==========================================================
    */

    async function generateNormalOutputs(ids) {
      if (!ids.length) {
        return [];
      }

      const prompt = `
You are TransformAI, an enterprise AI content transformation engine.

Transform the source into detailed professional outputs.

SOURCE CONTENT:
${sourceContent}

SOURCE ANALYSIS:
${JSON.stringify(analysis || {}, null, 2)}

USER SETTINGS:
${JSON.stringify(settings || {}, null, 2)}

REQUESTED OUTPUTS:
${JSON.stringify(ids)}

IMPORTANT:

Do not create shallow outputs.

Use complete explanations and meaningful sections.

Do not invent facts, statistics, names, dates, organizations,
quotes or unsupported claims.

Return ONLY valid JSON.

Return exactly one object for every requested ID.

Each object:

{
  "id": "exec",
  "title": "Generated title",
  "sections": [
    ["Section name", "Detailed content"]
  ]
}

Every section must contain exactly two strings.

==================================================
EXECUTIVE SUMMARY
==================================================

Use 7–9 sections.

Include:

Overview
Background
Current Situation
Key Findings
Major Issues
Impact
Important Evidence
Recommendations
Conclusion

==================================================
SECURITY ADVISORY
==================================================

Use 8–10 sections.

Include where supported:

Severity
Affected Area
Executive Summary
Description
Impact
Risk
Indicators
Mitigation
Recommended Actions
Operational Considerations

Do not invent a security incident.

==================================================
LINKEDIN
==================================================

Use 7–9 sections.

Include:

Hook
Context
Main Message
Key Development
Key Points
Why It Matters
Closing
Hashtags

Create an actual professional LinkedIn post.

==================================================
X THREAD
==================================================

Create 7–8 meaningful posts.

Use:

Post 1
Post 2
Post 3
Post 4
Post 5
Post 6
Post 7
Post 8

==================================================
VIDEO
==================================================

Use 9–12 sections.

Include:

Video Title
Objective
Audience
Duration
Opening Hook
Full Script
Scene Breakdown
Narration
Visual Recommendations
On-Screen Text
Subtitles
Closing

==================================================
INFOGRAPHIC
==================================================

Use 8–10 sections.

Include:

Title
Core Message
Background
Key Fact
Problem
Evidence
Solution
Benefits
Takeaway
Call to Action

==================================================
EMAIL
==================================================

Use 7–9 sections.

Include:

Subject
Greeting
Opening
Background
Main Message
Key Details
Required Actions
Closing
Sign-off

==================================================
FAQ
==================================================

Create 8–12 meaningful questions and answers.

==================================================
PRESS RELEASE
==================================================

Use 8–10 sections.

Include:

Headline
Subheadline
Introduction
Background
Main Development
Key Details
Impact
Supporting Information
Next Steps
Contact

Do not invent quotes.

==================================================
INCIDENT REPORT
==================================================

Use 9–12 sections.

Include:

Incident
Overview
Date / Time
Affected Area
Description
Timeline
Impact
Contributing Factors
Actions Taken
Current Status
Recommendations
Lessons Learned

Only use information supported by the source.

Return ONLY the JSON array.
`;

      const result = await callGemini(
        prompt,
        0.4
      );

      if (!Array.isArray(result)) {
        throw new Error(
          "Normal generation returned invalid data"
        );
      }

      return result;
    }

    /*
    ==========================================================
    SPLIT REQUESTS
    ==========================================================
    */

    const hasPresentation =
      selectedOutputs.includes("ppt");

    const normalIds =
      selectedOutputs.filter(id => id !== "ppt");

    let results = [];

    /*
    PPT gets its OWN Gemini request.
    */

    if (hasPresentation) {
      try {
        const presentation =
          await generatePresentation();

        results.push(presentation);
      } catch (error) {
        console.error(
          "Dedicated PPT generation failed:",
          error
        );

        results.push({
          id: "ppt",
          title: "Professional Presentation",
          group: "Presentation",
          vis: false,
          sections: [
            [
              "Generation Error",
              "The dedicated presentation generation request failed. Please try generating the presentation again."
            ]
          ]
        });
      }
    }

    /*
    Other outputs get a separate request.
    */

    if (normalIds.length) {
      try {
        const normalResults =
          await generateNormalOutputs(normalIds);

        const generatedMap = new Map();

        for (const item of normalResults) {
          if (
            !item ||
            !normalIds.includes(item.id)
          ) {
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

          if (!sections.length) {
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
              item.title ||
              outputNames[item.id] ||
              "Generated Output",
            group:
              outputGroups[item.id] ||
              "Summary",
            vis: item.id === "inf",
            sections
          });
        }

        for (const id of normalIds) {
          if (generatedMap.has(id)) {
            results.push(
              generatedMap.get(id)
            );
          } else {
            results.push({
              id,
              title:
                outputNames[id] ||
                "Generated Output",
              group:
                outputGroups[id] ||
                "Summary",
              vis: id === "inf",
              sections: [
                [
                  "Generated Content",
                  "No structured content was returned for this format."
                ]
              ]
            });
          }
        }
      } catch (error) {
        console.error(
          "Normal generation failed:",
          error
        );

        for (const id of normalIds) {
          results.push({
            id,
            title:
              outputNames[id] ||
              "Generated Output",
            group:
              outputGroups[id] ||
              "Summary",
            vis: id === "inf",
            sections: [
              [
                "Generation Error",
                "Content generation failed for this format. Please try again."
              ]
            ]
          });
        }
      }
    }

    /*
    ==========================================================
    RETURN RESULTS
    ==========================================================
    */

    const orderedResults =
      selectedOutputs.map(id =>
        results.find(
          item => item.id === id
        )
      ).filter(Boolean);

    return res.status(200).json(
      orderedResults
    );

  } catch (error) {
    console.error(
      "Generation error:",
      error
    );

    return res.status(500).json({
      error: "Content generation failed",
      message: error.message
    });
  }
}
