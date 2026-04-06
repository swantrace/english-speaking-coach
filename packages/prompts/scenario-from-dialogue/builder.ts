import { buildJsonOutputConstraints, buildMultiWordPhraseGuidelines } from "../helper";
import type { BuildScenarioFromDialoguePromptParams } from "./schema";

export function buildScenarioFromDialoguePrompt(params: BuildScenarioFromDialoguePromptParams) {
	const { rawDialogue, contextHint } = params;

	const system = `You are a scenario architect for the English Speaking Practice Coach.
Your goal is to convert real-world dialogue examples (from books, websites, etc.) into structured scenario definitions that can be stored in the database and used for role-play practice.
The scenario must be internally consistent: goals, roles, dialogue, and key phrases should all describe the SAME situation.`;

	const prompt = `[TASK]
Convert the provided dialogue into a structured scenario overview.

[INPUTS]
- Raw Dialogue:
\`\`\`
${rawDialogue}
\`\`\`

${contextHint ? `- Context Hint: ${contextHint}\n  Use this hint to infer the setting if the dialogue doesn't make it clear.\n` : ""}

[OUTPUT FIELDS]
You MUST output a single JSON object with these keys:

1. title: string
   - A concise (3-8 words) and engaging title that captures the scenario.
   - Examples: "Ordering at a Coffee Shop", "Hotel Check-in Conversation", "Job Interview Practice"

2. description: string
   - A vivid, scene-setting description (one short paragraph).
   - Describe the situation, setting, and any relevant context.
   - This should align with the dialogue provided.

3. goals: string[]
   - 3-5 concrete, measurable communicative or learning goals for this scenario.
   - Extract these based on what communication skills the dialogue demonstrates.
   - Examples:
       - "Practice placing an order politely"
       - "Ask for clarification when confused"
       - "Describe a problem and request help"
       - "Negotiate or make suggestions"
   - The dialogue MUST demonstrate these goals in action.

4. roles: string[]
   - Exactly two role labels describing the participants in the dialogue.
   - Infer these from the dialogue content or use the context hint.
   - Examples:
       - ["customer", "barista"]
       - ["receptionist", "guest"]
       - ["interviewer", "candidate"]
   - Do NOT assume which role is the learner: the user may take either role.
   - These are just character labels used in the dialogue.

5. exampleDialogue: { role: string; content: string }[]
   - Parse the raw dialogue into structured turns.
   - Requirements:
       - The "role" field for each turn must be one of the two labels from the roles array.
       - Infer who is speaking based on context, speaker labels, or dialogue flow.
       - If speaker labels are absent, make reasonable inferences based on content.
       - Clean up the dialogue: remove stage directions, author notes, or extraneous text.
       - Each turn should be 1-2 concise sentences (you may split or merge turns if needed for clarity).
       - Preserve the natural flow and authenticity of the original dialogue.
       - The dialogue may alternate between roles, but strict alternation is not required.

6. suggestedKeyPhrases: { phrase: string; explanation: string }[]
   - ${buildMultiWordPhraseGuidelines("suggestion")}
   - Extract 2-8 useful multi-word phrases from the dialogue.
   - Focus on phrases that are idiomatic, functional, or particularly useful for learners.


[CONSTRAINTS]
${buildJsonOutputConstraints(["title", "description", "goals", "roles", "exampleDialogue", "suggestedKeyPhrases"])}
- Internal consistency:
    - The description, goals, roles, and dialogue must all describe the same scenario.
    - Each dialogue turn's "role" must match one of the entries in "roles" exactly.
    - suggestedKeyPhrases MUST be extracted from the dialogue content only.
- Preservation:
    - Keep the dialogue as authentic as possible; only clean up formatting and clarity.
    - Do not add new dialogue turns that weren't in the original.
- Deduplicate all lists (goals, roles, exampleDialogue turns, suggestedKeyPhrases).`;

	return { system, prompt };
}
