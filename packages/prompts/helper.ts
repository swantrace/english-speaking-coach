/**
 * Shared helper functions for prompt builders.
 * Reduces duplication and centralizes common prompt generation logic.
 */

/**
 * Maps CEFR level codes to human-readable descriptions.
 */
export function getLevelDescription(learnerLevel: "A2" | "B1" | "B2" | "C1" | string): string {
	switch (learnerLevel) {
		case "A2":
			return "lower-intermediate (A2)";
		case "B1":
			return "intermediate (B1)";
		case "B2":
			return "upper-intermediate (B2)";
		case "C1":
			return "advanced (C1)";
		default:
			return "intermediate";
	}
}

/**
 * Generates the analysis context section for free-form prompts.
 */
export function buildAnalysisSection(
	analysis?: {
		summary: string;
		corrections: {
			original: string;
			correction: string;
			explanation: string;
		}[];
		newlyDiscoveredKps: { phrase: string; explanation: string }[];
		patternIssues: string[];
	} | null,
): string {
	if (!analysis) return "";

	return `
[ROLE-PLAY ANALYSIS CONTEXT]
- Summary: ${analysis.summary}
- Corrections (${analysis.corrections.length}): ${JSON.stringify(analysis.corrections)}
- Newly discovered knowledge points (${analysis.newlyDiscoveredKps.length}): ${JSON.stringify(analysis.newlyDiscoveredKps)}
- Pattern issues: ${JSON.stringify(analysis.patternIssues)}

Use this information to:
- Address the pattern issues through targeted practice.
- Recycle and reinforce the newly discovered knowledge points.
- Build on the corrections to prevent similar mistakes.
`;
}

/**
 * Generates the functional scenario context section for free-form prompts.
 */
export function buildFunctionalScenarioSection(
	functionalScenario?: {
		title: string;
		description: string;
		tags: string[];
		examplePhrases: { phrase: string; explanation: string }[];
	} | null,
): string {
	if (!functionalScenario) return "";

	return `
[FUNCTIONAL SCENARIO CONTEXT]
- Title: ${functionalScenario.title}
- Description: ${functionalScenario.description}
- Tags: ${JSON.stringify(functionalScenario.tags)}
- Example phrases: ${JSON.stringify(functionalScenario.examplePhrases)}

Use this information to:
- Focus on the grammar/functional features implied by the tags.
- Incorporate the example phrases into explanations and drills.
- Keep the practice anchored in this scenario, but still flexible.
`;
}

/**
 * Generates the overall context section for free-form prompts.
 * Combines analysis and functional scenario sections, or provides default text.
 */
export function buildOverallContextSection(analysisSection: string, functionalScenarioSection: string): string {
	if (analysisSection || functionalScenarioSection) {
		return analysisSection + functionalScenarioSection;
	}

	return `
[CONTEXT]
No prior scenario or analysis is provided.
You are in pure free-form tutoring mode:
- Ask a brief question at the start to clarify what the learner wants to practice.
- Then adapt to the learner's questions and performance.`;
}

/**
 * Generates detailed multi-word phrase extraction/discovery guidelines.
 * Used in session analysis and scenario generation prompts.
 */
export function buildMultiWordPhraseGuidelines(context: "discovery" | "suggestion"): string {
	const countRange = context === "discovery" ? "3-10" : "6-12";
	const contextDescription = context === "discovery" ? "that appeared in the conversation" : "for this scenario";
	const purposeDescription =
		context === "discovery"
			? "These should be phrases the learner encountered (either used or heard from assistant)."
			: "These will later become formal knowledge points in the database.";

	const extractionRules =
		context === "suggestion"
			? `
   - EXTRACTION RULES:
       - Every "phrase" MUST come directly from the exampleDialogue.
       - Do NOT invent phrases that never appear in the dialogue.
       - You may trim surrounding words, but the core phrase must be a contiguous span from the dialogue.
       - If targetPhrases were provided, prioritize including them (if they appear in dialogue).`
			: "";

	return `${countRange} useful **multi-word phrases or expressions** ${contextDescription}.
   - ${purposeDescription}
   - Focus on MULTI-WORD chunks only:
       ✓ Phrasal verbs: "check out", "run into", "look forward to"
       ✓ Collocations: "make a decision", "strong coffee", "pay attention"
       ✓ Idioms: "break the ice", "hit the nail on the head"
       ✓ Slang/informal: "grab a coffee", "hang out", "no worries"
       ✓ Sentence patterns: "I'd rather X than Y", "I was wondering if..."
       ✓ Useful expressions: "I'm good, thanks", "That works for me", "Would you mind..."
   - DO NOT include:
       ✗ Single words ("sophisticated", "beverage", "however")
       ✗ Basic vocabulary ("table", "happy", "run")
       ✗ Common function words ("although", "because", "therefore")
   - Classification priority (when ambiguous):
       1. Phrasal verb (verb + particle) → "phrasal_verb"
       2. Word pairing (adj+noun, verb+noun) → "collocation"
       3. Figurative meaning → "idiom"
       4. Informal/casual register → "slang"
       5. Structural template → "sentence_pattern"
       6. Otherwise → "useful_expression"${extractionRules}
   - Each:
       - phrase: The expression (keep it concise and reusable, not full sentences).
       - explanation: Short learner-friendly explanation (10-25 words).
   - Examples:
     - { "phrase": "check out", "explanation": "Phrasal verb meaning to examine something or leave a hotel. Common in casual contexts." }
     - { "phrase": "I'm good, thanks", "explanation": "Polite way to decline an offer. Very common in American English." }
     - { "phrase": "make a reservation", "explanation": "Standard collocation for booking a table/room. Use 'make' not 'do'." }
     - { "phrase": "I was wondering if", "explanation": "Polite way to make a request. More indirect and courteous than 'Can you...'" }
   - Deduplicate phrases; do not include the same phrase twice.`;
}

/**
 * Generates tool usage instructions for role-play scenarios.
 * Includes detailed field definitions and optional example.
 */
export function buildToolUsageInstructions(includeExample = true): string {
	const exampleSection = includeExample
		? `
-------------------------------------------------------------------------------
EXAMPLE TOOL INPUT (JSON SHAPE — NOT CONTENT RULES)
-------------------------------------------------------------------------------
Example remaining state:

Remaining Goals:
[
  "Greet the receptionist and provide reservation details",
  "Ask about breakfast hours and location"
]

Remaining Target KPs:
[
  { "id": "kp_reservation", "phrase": "reservation" },
  { "id": "kp_breakfast_included", "phrase": "breakfast included" }
]

User message:
"Hi! I have a reservation under Smith. I had better check in now since I need to get up early. Also, what time is breakfast?"

A correct tool call structure would look like:

{
  "newlyCompletedGoals": [
    "Greet the receptionist and provide reservation details",
    "Ask about breakfast hours and location"
  ],
  "newlyUsedTargetKps": [
    { "id": "kp_reservation", "phrase": "reservation" }
  ]
}
`
		: "";

	return `-------------------------------------------------------------------------------
GENERAL RULES FOR TOOL CALLS
-------------------------------------------------------------------------------
1. Use the data in [PROGRESS STATE] as the source of truth.
2. The tool input must follow the exact JSON structure specified here.
3. The tool call must come before your spoken reply.
4. Never mention the tool, JSON, or internal reasoning in the spoken reply.
5. When copying goal strings or target KPs, copy them **verbatim** from
   [PROGRESS STATE]. Do not rephrase or shorten.

-------------------------------------------------------------------------------
FIELD 1: "newlyCompletedGoals"
-------------------------------------------------------------------------------
Definition:
A list of items from "Remaining Goals" that were completed in the latest
exchange (by either the **user** or the **assistant**).

Procedure:
1. Examine the user's latest message AND the assistant's previous message.
2. For each goal in "Remaining Goals":
   - Ask: "Did the user's message OR the assistant's message perform the action
     or provide the information required by this goal?"
   - Note: If the user **accepts** a suggestion or offer related to the goal,
     mark it as completed.
3. If yes → include it (verbatim).
4. If none were completed → return [].

Do NOT:
- Mark partial completion.
- Infer based on older messages (older than the last turn).
- Reword goals.

-------------------------------------------------------------------------------
FIELD 2: "newlyUsedTargetKps"
-------------------------------------------------------------------------------
Definition:
Target KPs from "Remaining Target KPs" that the user used correctly in their
latest message(s).

Important:
- Each remaining target KP is an object: { "id": string, "phrase": string }.
- When you include an item, you MUST copy both "id" and "phrase" exactly as
  shown in "Remaining Target KPs".

Procedure:
1. For each item in "Remaining Target KPs":
   - Did the user correctly use this phrase in the latest message(s)?
2. If yes → include the entire object { id, phrase }.
3. If none → return [].
${exampleSection}`;
}

/**
 * Generates standard JSON output constraint text.
 */
export function buildJsonOutputConstraints(requiredKeys: string[]): string {
	const keysFormatted = requiredKeys.map((k) => `"${k}"`).join(", ");
	return `- Output MUST be a valid JSON object, not wrapped in markdown, prose, or code fences.
- Keys MUST be exactly: ${keysFormatted}.
- Do NOT add extra fields.`;
}

/**
 * Formats knowledge point types and tag lists for prompts.
 */
export function formatKnowledgePointTypesAndTags(
	types: readonly string[],
	grammarTags: readonly string[],
	functionalTags: readonly string[],
): {
	formattedTypes: string;
	formattedGrammarTags: string;
	formattedFunctionalTags: string;
} {
	return {
		formattedTypes: types.map((type) => `"${type}"`).join(" | "),
		formattedGrammarTags: grammarTags.map((tag) => `"${tag}"`).join(", "),
		formattedFunctionalTags: functionalTags.map((tag) => `"${tag}"`).join(", "),
	};
}
