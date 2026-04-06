import { z } from "zod";

/**
 * Input schema for the dialogue-to-scenario conversion prompt.
 */
export const BuildScenarioFromDialoguePromptParamsSchema = z.object({
	rawDialogue: z.string().describe("The raw dialogue text to convert"),
	contextHint: z
		.string()
		.optional()
		.describe("Optional context or setting hint (e.g., 'at a coffee shop', 'job interview')"),
});

export type BuildScenarioFromDialoguePromptParams = z.infer<typeof BuildScenarioFromDialoguePromptParamsSchema>;

/**
 * Output schema for dialogue-to-scenario conversion.
 * Reuses the same structure as scenarioOverviewGenerate.
 */
export const scenarioDialogueTurn = z.object({
	role: z.string(),
	content: z.string(),
});

export const ScenarioFromDialogueSchema = z.object({
	title: z.string(),
	description: z.string(),
	goals: z.array(z.string()).min(1),
	roles: z.array(z.string()).length(2).describe("Exactly two role labels: [roleA, roleB]."),
	exampleDialogue: z.array(scenarioDialogueTurn).describe("The parsed and formatted dialogue."),
	suggestedKeyPhrases: z.array(
		z.object({
			phrase: z.string(),
			explanation: z.string(),
		}),
	),
});

export type ScenarioFromDialogue = z.infer<typeof ScenarioFromDialogueSchema>;
