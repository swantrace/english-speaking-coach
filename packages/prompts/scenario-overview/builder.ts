import { buildJsonOutputConstraints, buildMultiWordPhraseGuidelines } from "../helper";
import type { BuildScenarioOverviewGeneratePromptParams } from "./schema";

export function buildScenarioOverviewGeneratePrompt(params: BuildScenarioOverviewGeneratePromptParams) {
	const { draftDescription, targetPhrases } = params;

	const system = `You are a scenario architect for the English Speaking Practice Coach.
Your goal is to transform draft inputs into a polished, structured scenario definition that can be stored in the database and used for role-play practice.
The scenario must be internally consistent: goals, roles, dialogue, and key phrases should all describe the SAME situation.`;

	const prompt = `[TASK]
Generate a structured scenario overview based on the provided drafts.

[INPUTS]
- Draft Description: ${draftDescription}
- Target Phrases (optional): ${targetPhrases?.join(" | ") || "None"}
  ${targetPhrases && targetPhrases.length > 0 ? "→ These phrases SHOULD appear naturally in the exampleDialogue." : ""}

[OUTPUT FIELDS]
You MUST output a single JSON object with these keys:

1. title: string
   - A concise (3-8 words) and engaging title.

2. description: string
   - A vivid, scene-setting description (one short paragraph).
   - This should clearly describe the same situation that will appear in the dialogue.

3. goals: string[]
   - 3-5 concrete, measurable communicative or learning goals for this scenario.
   - Examples:
       - "Practice checking into a hotel"
       - "Ask for clarification politely"
       - "Describe a problem and ask for help"
   - The exampleDialogue MUST demonstrate these goals in action.

4. roles: string[]
   - Exactly two role labels describing the participants in the scenario.
   - Examples:
       - ["hotel receptionist", "guest"]
       - ["interviewer", "candidate"]
       - ["manager", "employee"]
   - Do NOT assume which role is the learner: the user may take either role.
   - These are just character labels used in the dialogue.

5. exampleDialogue: { role: string; content: string }[]
   - A 4-10 turn dialogue showing realistic progress through the scenario.
   - Requirements:
       - The "role" field for each turn must always be one of the two labels from the roles array.
       - The dialogue may alternate between roles, but strict alternation is not required.
       - Each turn should be 1-2 concise sentences.
       - The dialogue should clearly reflect and cover the goals array (e.g., if a goal is "make a polite complaint", the dialogue must contain a polite complaint).
       - The tone should be natural and appropriate for the context.

6. suggestedKeyPhrases: { phrase: string; explanation: string }[]
   - ${buildMultiWordPhraseGuidelines("suggestion")}


[CONSTRAINTS]
${buildJsonOutputConstraints(["title", "description", "goals", "roles", "exampleDialogue", "suggestedKeyPhrases"])}
- Internal consistency:
    - The description, goals, roles, and dialogue must all describe the same scenario.
    - Each dialogue turn's "role" must match one of the entries in "roles" exactly.
    - suggestedKeyPhrases MUST be extracted from the exampleDialogue only.
- Deduplicate all lists (goals, roles, exampleDialogue turns, suggestedKeyPhrases).`;

	return { system, prompt };
}
