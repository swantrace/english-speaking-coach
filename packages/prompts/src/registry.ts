// import { type BuildScenarioFromDialoguePromptParams, buildScenarioFromDialoguePrompt } from "./scenario-from-dialogue";
// import {./src/scenario-from-dialogue
//   type BuildScenarioOverviewGeneratePromptParams,
//   buildScenarioOverviewGeneratePrompt,
// } from "./scenario-generate";
// import { ./src/scenario-generatenalysisPromptParams, buildSessionAnalysisPrompt } from "./session-analysis";
// import { type BuildKnowledgeItemGeneratePromptParams, buildKnowledgeItemGeneratePro./src/session-analysisknowledge-item";

import { buildKnowledgeItemGeneratePrompt } from "./knowledge-item";
import {
  buildScenarioExampleDialoguePrompt,
  buildScenarioGoalsGeneratePrompt,
  buildScenarioStoryGeneratePrompt,
} from "./scenario";
import { buildInConversationAnalysisPrompt, buildSessionReviewPrompt } from "./session";

export type PromptRegistry = {
  knowledgeItemGenerate: () => {
    system: string;
    prompt: string;
  };
  scenarioStoryGenerate: () => {
    system: string;
    prompt: string;
  };
  scenarioGoalsGenerate: () => {
    system: string;
    prompt: string;
  };
  scenarioExampleDialogueGenerate: () => {
    system: string;
    prompt: string;
  };
  sessionReview: () => {
    system: string;
    prompt: string;
  };
  inConversationAnalysis: () => {
    system: string;
    prompt: string;
  };
};

const registry: PromptRegistry = {
  knowledgeItemGenerate: buildKnowledgeItemGeneratePrompt,
  scenarioStoryGenerate: buildScenarioStoryGeneratePrompt,
  scenarioGoalsGenerate: buildScenarioGoalsGeneratePrompt,
  scenarioExampleDialogueGenerate: buildScenarioExampleDialoguePrompt,
  sessionReview: buildSessionReviewPrompt,
  inConversationAnalysis: buildInConversationAnalysisPrompt,
};

export function buildPrompt<K extends keyof PromptRegistry>(
  name: K,
  params: Parameters<PromptRegistry[K]>[0],
): { systemPrompt: string } {
  const builder = registry[name];
  if (!builder) {
    throw new Error(`Prompt builder not found for: ${name}`);
  }
  // @ts-expect-error -- exact builder signatures vary slightly per prompt
  return builder(params);
}

export function listPromptNames(): (keyof PromptRegistry)[] {
  return Object.keys(registry) as (keyof PromptRegistry)[];
}
