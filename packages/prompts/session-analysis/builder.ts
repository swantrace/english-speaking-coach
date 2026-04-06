// src/agent/prompts/session-analysis/builder.ts

import { buildJsonOutputConstraints, buildMultiWordPhraseGuidelines, getLevelDescription } from "../helper";
import type { BuildSessionAnalysisPromptParams } from "./schema";

export function buildSessionAnalysisPrompt(params: BuildSessionAnalysisPromptParams): {
	system: string;
	prompt: string;
} {
	const { scenario, session, transcript, learnerLevel } = params;

	const levelDescription = getLevelDescription(learnerLevel);

	const transcriptText =
		transcript.length === 0
			? "NO TRANSCRIPT MESSAGES."
			: transcript.map((turn, index) => `${index + 1}. ${turn.role.toUpperCase()}: ${turn.content}`).join("\n");

	const system = `You are an experienced English teacher analyzing a learner's role-play conversation.
Your job is to produce a structured analysis JSON that can be stored in the database
and later used by the learner and by a follow-up free-form tutor.

The learner is approximately ${levelDescription}.
Write all analysis in clear, simple English. Avoid jargon. Be specific and practical.`;

	const prompt = `[SCENARIO]
Title: ${scenario.title}
Description: ${scenario.description}

[SESSION SNAPSHOT]
Initial goals (the scenario's learning objectives):
${JSON.stringify(session.goals, null, 2)}

Initial target knowledge points (KPs):
${JSON.stringify(session.targetKps, null, 2)}

[TRANSCRIPT]
The following is the complete transcript of the role-play session.
Messages are in chronological order:

${transcriptText}

[TASK]
Based on the scenario, goals, target KPs, and the full transcript, analyze the learner's performance and produce ONE JSON object matching exactly the following structure:

{
  "summary": string,
  "corrections": [
    { "original": string, "correction": string, "explanation": string }
  ],
  "newlyDiscoveredKps": [
    { "phrase": string, "explanation": string }
  ],
  "patternIssues": string[]
}

Field definitions and guidelines:

1. summary (string)
   - 2-4 sentences.
   - Briefly describe what happened in the role-play and how well the learner performed overall.
   - Include both positive observations and areas for improvement.

2. corrections ({ original, correction, explanation }[])
   - 5-15 specific corrections. THIS IS THE MOST IMPORTANT FIELD.
   - Focus on mistakes, unnatural phrasing, or better alternatives.
   - "original": The exact (or slightly trimmed) sentence/phrase the learner said.
   - "correction": The natural, native way to express the same meaning.
   - "explanation": Brief explanation of why the correction is better.
     - Mention grammar, tone, word choice, collocation, or cultural appropriateness.
     - Keep it simple and practical (10-30 words).
   - Per-turn rule: At most ONE correction per learner (USER) turn.
     - Fallback: If a holistic rewrite is ambiguous or the turn is extremely long, select the most impactful segment and provide ONE natural rewrite for that segment.
     - Holistic rewrite: Prefer providing ONE corrected rewrite that resolves ALL issues in that learner turn while preserving the original intent.
       - Naturalness first: Prefer idiomatic, native-like phrasing over minimal edits when it clearly improves clarity and naturalness.
       - Keep meaning intact and avoid introducing new information.
     - Optionally mention lesser issues inside the explanation, but do NOT add extra correction items for the same turn.
   - Strict anchoring:
     - "original" must come verbatim (or lightly trimmed) from exactly ONE USER turn.
     - Do not combine text across turns; do not correct ASSISTANT turns.
   - Prioritize:
     - Clear errors (grammar, vocabulary mistakes)
     - Unnatural phrasing that native speakers wouldn't use
     - Better alternatives that sound more natural or appropriate
   - Examples:
     - original: "I want coffee"
       correction: "I'd like a coffee, please"
       explanation: "More polite and natural for service situations. 'I'd like' is softer than 'I want', and adding 'please' shows courtesy."

3. newlyDiscoveredKps ({ phrase, explanation }[])
   - ${buildMultiWordPhraseGuidelines("discovery")}

4. patternIssues (string[])
   - 0-3 high-level recurring problems (if you notice clear patterns).
   - Only include if you see the SAME type of error multiple times.
   - Each item should describe a systemic issue, not a one-time mistake.
   - Examples:
     - "Frequently drops articles ('a', 'the') before nouns"
     - "Inconsistent past tense usage - mixes past and present"
     - "Tends to use overly formal language in casual situations"
     - "Often translates word-for-word from native language structure"
   - Leave empty ([]) if no clear patterns emerge.

[CONSTRAINTS]
${buildJsonOutputConstraints(["summary", "corrections", "newlyDiscoveredKps", "patternIssues"])}
- All arrays must be present (use [] if empty).
- Focus on ACTIONABLE, SPECIFIC feedback that helps the learner improve.
 - The "corrections" field is the most valuable - be thorough and precise.
 - Do NOT correct the same learner (USER) turn more than once. Choose the single best correction for that turn.`;

	return { system, prompt };
}
