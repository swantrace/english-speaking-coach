// src/agent/prompts/free-form/schema.ts
import { z } from "zod";
import type { ProviderId } from "../types";

/**
 * Minimal view of a prior role-play session analysis,
 * only keeping what the free-form tutor actually needs.
 */
export const FreeFormAnalysisSchema = z.object({
	summary: z.string().describe("Concise summary of what happened in the original role-play."),
	corrections: z
		.array(
			z.object({
				original: z.string(),
				correction: z.string(),
				explanation: z.string(),
			}),
		)
		.default([])
		.describe("Specific corrections and better alternatives from the session."),
	newlyDiscoveredKps: z
		.array(
			z.object({
				phrase: z.string(),
				explanation: z.string(),
			}),
		)
		.default([])
		.describe("Useful multi-word phrases that appeared in the conversation."),
	patternIssues: z.array(z.string()).default([]).describe("High-level recurring problems observed in the session."),
});

export type FreeFormAnalysis = z.infer<typeof FreeFormAnalysisSchema>;

/**
 * Minimal view of a functional scenario used to seed free-form practice.
 */
export const FunctionalScenarioForFreeFormSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string(),
	/**
	 * Typically g:/f:/t:/lvl: tags from `scenarios.tags`.
	 * The tutor doesn't need to fully understand the tag ontology,
	 * but can use them as hints (grammar focus, functional focus, topic).
	 */
	tags: z.array(z.string()).default([]),
	/**
	 * Example phrases extracted from related KPs, passed in from backend.
	 * The tutor can use these as starting points for drills and practice.
	 */
	examplePhrases: z
		.array(
			z.object({
				phrase: z.string(),
				explanation: z.string(),
			}),
		)
		.default([]),
});

export type FunctionalScenarioForFreeForm = z.infer<typeof FunctionalScenarioForFreeFormSchema>;

/**
 * CEFR learner levels for tailoring explanations.
 */
export const learnerLevels = ["A2", "B1", "B2", "C1"] as const;
export type LearnerLevel = (typeof learnerLevels)[number];

/**
 * Params used to build the free-form tutor system prompt.
 *
 * Exactly one of `analysis` or `functionalScenario` may be present,
 * or both may be null for pure free-form.
 */
export type BuildFreeFormSystemPromptParams = {
	provider: ProviderId;
	learnerLevel: LearnerLevel;

	// Entry A: from role-play analysis
	analysis?: FreeFormAnalysis | null;

	// Entry B: from functional scenario
	functionalScenario?: FunctionalScenarioForFreeForm | null;
};
