export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const {
      sourceContent,
      sourceType,
      userSettings
    } = req.body || {};

    if (!sourceContent) {
      return res.status(400).json({
        error: "Source content is required"
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured"
      });
    }

    const prompt = `
You are TransformAI, an enterprise-grade AI content analysis engine.

Analyze the provided source content deeply before it is transformed into multiple content formats.

The analysis will be used by another AI generation stage, so the analysis must be detailed, structured, factual and useful.

Do NOT give a shallow summary.

==================================================
SOURCE TYPE
==================================================

${sourceType || "Unknown"}

==================================================
SOURCE CONTENT
==================================================

${sourceContent}

==================================================
USER SETTINGS
==================================================

${JSON.stringify(userSettings || {}, null, 2)}

==================================================
ANALYSIS OBJECTIVE
==================================================

Understand the source completely enough to support:

- Executive summaries
- Security advisories
- Social media posts
- Video scripts
- Infographics
- Presentations
- Emails
- FAQs
- Press releases
- Incident reports

Identify the actual meaning, facts, themes, audience, intent, risks, entities and important details present in the source.

==================================================
IMPORTANT FACTUAL RULES
==================================================

1. Use ONLY information supported by the source.
2. Do NOT invent facts.
3. Do NOT invent statistics.
4. Do NOT invent names.
5. Do NOT invent dates.
6. Do NOT invent organizations.
7. Do NOT invent quotes.
8. Do NOT assume information that is not present.
9. Clearly distinguish facts from uncertainty.
10. If something is unavailable, use an empty array or state that it is not provided.
11. Do not use general knowledge to fill missing information.
12. Preserve important terminology from the source.
13. Identify contradictions or unclear statements when present.
14. Identify sensitive information carefully.
15. Identify claims that may require verification.

==================================================
RETURN FORMAT
==================================================

Return ONLY valid JSON.

Return exactly this structure:

{
  "contentType": "",
  "topic": "",
  "intent": "",
  "audience": "",
  "themes": [],
  "confidence": 0,
  "sensitive": [],
  "summary": "",
  "detailedSummary": "",
  "keyPoints": [],
  "mainFacts": [],
  "statistics": [],
  "entities": [],
  "organizations": [],
  "locations": [],
  "dates": [],
  "people": [],
  "technologies": [],
  "processes": [],
  "problems": [],
  "challenges": [],
  "risks": [],
  "opportunities": [],
  "recommendations": [],
  "claimsRequiringVerification": [],
  "uncertainties": [],
  "contradictions": [],
  "keywords": [],
  "sourceStructure": [],
  "transformationGuidance": ""
}

==================================================
FIELD REQUIREMENTS
==================================================

contentType:

Identify what kind of content this is.

Examples:

Government Report
Technical Document
News Article
Security Report
Research Paper
Policy Document
Business Report
Press Release
Incident Report
Educational Content

Only select what the source supports.

--------------------------------------------------

topic:

Identify the main topic in a clear and specific way.

Avoid vague topics such as:

"General Information"

--------------------------------------------------

intent:

Identify what the source is trying to accomplish.

Examples:

Inform
Explain
Warn
Recommend
Report
Instruct
Analyze
Announce
Request Action

Use multiple purposes when appropriate.

--------------------------------------------------

audience:

Identify the intended audience based on the source.

Examples:

Government Officials
Security Teams
Farmers
Technical Staff
General Public
Management
Researchers

Do not invent an audience if it is not reasonably supported.

--------------------------------------------------

themes:

List the major themes.

Provide approximately 4–10 meaningful themes when supported.

--------------------------------------------------

confidence:

Give a number from 0 to 100 representing how confidently the source meaning can be determined.

This is NOT a quality score.

It represents analysis confidence.

--------------------------------------------------

sensitive:

Identify sensitive information present in the source.

Possible categories:

Personal Information
Contact Information
Credentials
Security Information
Financial Information
Government Information
Location Information
Confidential Information

Return an empty array if none is present.

--------------------------------------------------

summary:

Give a concise 2–4 sentence summary.

--------------------------------------------------

detailedSummary:

Give a comprehensive summary of the source.

Explain the context, purpose, major information and conclusion.

Do not turn this into a generic summary.

--------------------------------------------------

keyPoints:

Extract approximately 5–12 important points.

Each point should represent meaningful information from the source.

--------------------------------------------------

mainFacts:

Extract the most important factual statements.

Do not add interpretation.

--------------------------------------------------

statistics:

Extract ALL meaningful numerical information.

Each item should contain:

{
  "value": "",
  "context": ""
}

Do not invent numbers.

--------------------------------------------------

entities:

Identify important entities mentioned in the source.

Examples:

systems
programs
projects
products
initiatives
technologies
institutions

--------------------------------------------------

organizations:

List organizations explicitly mentioned.

--------------------------------------------------

locations:

List locations explicitly mentioned.

--------------------------------------------------

dates:

List dates or time periods explicitly mentioned.

--------------------------------------------------

people:

List people explicitly mentioned.

--------------------------------------------------

technologies:

List technologies, platforms, systems or technical components explicitly mentioned.

--------------------------------------------------

processes:

Identify important processes described in the source.

Explain them briefly.

--------------------------------------------------

problems:

Identify the main problems described.

--------------------------------------------------

challenges:

Identify operational, technical, organizational or other challenges described.

--------------------------------------------------

risks:

Identify risks explicitly supported by the source.

Do not manufacture cybersecurity risks.

--------------------------------------------------

opportunities:

Identify opportunities or improvement areas supported by the source.

--------------------------------------------------

recommendations:

Extract recommendations already present in the source.

Do NOT create new recommendations unless they are clearly implied by the source.

--------------------------------------------------

claimsRequiringVerification:

Identify claims that appear quantitative, consequential or otherwise require external/source verification.

Examples:

- statistics
- performance claims
- financial claims
- security claims
- outcome claims

Do not automatically mark every sentence.

--------------------------------------------------

uncertainties:

Identify information that is unclear, incomplete or ambiguous.

--------------------------------------------------

contradictions:

Identify contradictory statements within the source.

Return an empty array if none exist.

--------------------------------------------------

keywords:

Extract approximately 8–20 important keywords.

--------------------------------------------------

sourceStructure:

Explain the structure of the source.

For example:

[
  "Background",
  "Problem",
  "Current Process",
  "Solution",
  "Results",
  "Recommendations"
]

Only include sections actually represented in the source.

--------------------------------------------------

transformationGuidance:

Provide detailed guidance for the next AI generation stage.

Explain:

- What information must be preserved
- What information should receive emphasis
- Which claims require caution
- Which facts can be reused across formats
- Which information should not be invented
- What tone or communication approach is appropriate based on the source and user settings

This field should be useful to the generation engine.

==================================================
QUALITY REQUIREMENT
==================================================

Perform a deep analysis.

Do not minimize the response.

Extract as much useful information as the source actually contains.

However, NEVER invent information simply to make the response longer.

Return ONLY the JSON object.
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
            temperature: 0.25,
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

    let result;

    try {
      result = JSON.parse(text);
    } catch (error) {
      console.error("Gemini JSON parse error:", error);
      console.error("Gemini raw response:", text);

      return res.status(500).json({
        error: "Gemini returned invalid JSON"
      });
    }

    if (!result || typeof result !== "object" || Array.isArray(result)) {
      return res.status(500).json({
        error: "Invalid analysis response"
      });
    }

    // Normalize important fields so the original frontend
    // continues to work without modification.

    result.contentType =
      result.contentType || "Unknown";

    result.topic =
      result.topic || "Unclassified Content";

    result.intent =
      result.intent || "Inform";

    result.audience =
      result.audience ||
      userSettings?.Audience ||
      "General Audience";

    result.themes =
      Array.isArray(result.themes)
        ? result.themes
        : [];

    result.confidence =
      typeof result.confidence === "number"
        ? Math.max(0, Math.min(100, result.confidence))
        : 0;

    result.sensitive =
      Array.isArray(result.sensitive)
        ? result.sensitive
        : [];

    result.summary =
      result.summary || "";

    result.detailedSummary =
      result.detailedSummary || result.summary || "";

    result.keyPoints =
      Array.isArray(result.keyPoints)
        ? result.keyPoints
        : [];

    result.mainFacts =
      Array.isArray(result.mainFacts)
        ? result.mainFacts
        : [];

    result.statistics =
      Array.isArray(result.statistics)
        ? result.statistics
        : [];

    result.entities =
      Array.isArray(result.entities)
        ? result.entities
        : [];

    result.organizations =
      Array.isArray(result.organizations)
        ? result.organizations
        : [];

    result.locations =
      Array.isArray(result.locations)
        ? result.locations
        : [];

    result.dates =
      Array.isArray(result.dates)
        ? result.dates
        : [];

    result.people =
      Array.isArray(result.people)
        ? result.people
        : [];

    result.technologies =
      Array.isArray(result.technologies)
        ? result.technologies
        : [];

    result.processes =
      Array.isArray(result.processes)
        ? result.processes
        : [];

    result.problems =
      Array.isArray(result.problems)
        ? result.problems
        : [];

    result.challenges =
      Array.isArray(result.challenges)
        ? result.challenges
        : [];

    result.risks =
      Array.isArray(result.risks)
        ? result.risks
        : [];

    result.opportunities =
      Array.isArray(result.opportunities)
        ? result.opportunities
        : [];

    result.recommendations =
      Array.isArray(result.recommendations)
        ? result.recommendations
        : [];

    result.claimsRequiringVerification =
      Array.isArray(result.claimsRequiringVerification)
        ? result.claimsRequiringVerification
        : [];

    result.uncertainties =
      Array.isArray(result.uncertainties)
        ? result.uncertainties
        : [];

    result.contradictions =
      Array.isArray(result.contradictions)
        ? result.contradictions
        : [];

    result.keywords =
      Array.isArray(result.keywords)
        ? result.keywords
        : [];

    result.sourceStructure =
      Array.isArray(result.sourceStructure)
        ? result.sourceStructure
        : [];

    result.transformationGuidance =
      result.transformationGuidance || "";

    return res.status(200).json(result);

  } catch (error) {
    console.error("Analysis error:", error);

    return res.status(500).json({
      error: "Analysis failed",
      message: error.message
    });
  }
}
