import { z } from "zod";
import type { SessionTargetKp } from "../../db/schema";
import type { ProviderId } from "../types";

export const analyzeLatestMessagesInputSchema = z.object({
	newlyCompletedGoals: z
		.array(z.string())
		.default([])
		.describe(
			"List of scenario goals that were fully achieved in the learner's latest message(s). These should be selected from the remaining goals when possible.",
		),

	newlyUsedTargetKps: z
		.array(
			z.object({
				id: z.string(),
				phrase: z.string(),
			}),
		)
		.default([])
		.describe(
			"List of target knowledge points that the learner has just used accurately in their latest message(s). Each item MUST be copied verbatim as { id, phrase } from the remaining target KPs.",
		),
});

export type AnalyzeLatestMessagesInput = z.infer<typeof analyzeLatestMessagesInputSchema>;

// The output mirrors the input so the model gets back exactly what it asked for.
export const analyzeLatestMessagesOutputSchema = analyzeLatestMessagesInputSchema;

export type AnalyzeLatestMessagesOutput = z.infer<typeof analyzeLatestMessagesOutputSchema>;

/**
 * Params for building the role-play system prompt.
 *
 * NOTE:
 * - `scenario` only contains static metadata (title, description).
 * - `session` contains roles, initial goals/KPs, and remaining goals/KPs.
 *   This matches what the client sends from `useRolePlayChat`.
 */
export type BuildRolePlaySystemPromptParams = {
	provider: ProviderId;
	scenario: {
		title: string;
		description: string;
	};
	session: {
		assistantRole: string;
		userRole: string;
		initialGoals: string[];
		initialTargetKps: SessionTargetKp[];

		remainingGoals: string[];
		remainingTargetKps: SessionTargetKp[];
	};
};
