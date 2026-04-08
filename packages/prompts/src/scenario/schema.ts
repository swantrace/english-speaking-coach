import { z } from "zod";
import type { ProviderId } from "../types";

export const scenarioDialogueTurn = z.object({
  role: z.string(),
  content: z.string(),
});

/**
 * Scenario generator output schema.
 *
 * This is intended to be mapped to the DB `scenarios` table:
 *  - title           -> scenarios.title
 *  - description     -> scenarios.description
 *  - goals           -> scenarios.defaultGoals
 *  - roles[0], [1]   -> scenarios.roles = [roleA, roleB]
 *  - exampleDialogue -> scenarios.exampleDialogue
 *  - suggestedKeyPhrases are used in the admin UI to seed knowledge points,
 *    but are NOT stored directly in the scenarios table.
 */
export const ScenarioOverviewGenerateSchema = z.object({
  title: z.string(),
  description: z.string(),

  // Will be stored as `defaultGoals` on the scenario.
  goals: z.array(z.string()).min(1),

  // Exactly two roles, aligned with DB: [roleA, roleB]
  roles: z.array(z.string()).length(2).describe("Exactly two role labels: [roleA, roleB]."),

  // Same shape as scenarios.exampleDialogue in the DB.
  exampleDialogue: z.array(scenarioDialogueTurn).describe("A single comprehensive example dialogue for the scenario."),

  /**
   * Suggested key phrases for this scenario.
   * These are not stored on the scenario record directly, but can be used
   * by the admin UI to seed / create knowledge points.
   */
  suggestedKeyPhrases: z
    .array(
      z.object({
        phrase: z.string(),
        explanation: z.string(),
      }),
    )
    .default([]),
});

export type ScenarioOverviewGenerateResult = z.infer<typeof ScenarioOverviewGenerateSchema>;

export type BuildScenarioOverviewGeneratePromptParams = {
  provider: ProviderId;
  draftDescription: string;
  /**
   * Optional target phrases that should appear in the dialogue.
   * These guide the scenario generation to include specific expressions.
   * Renamed from draftSentences for clarity.
   */
  targetPhrases?: string[];
};
