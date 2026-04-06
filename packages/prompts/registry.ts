import { type BuildKnowledgePointGeneratePromptParams, buildKnowledgePointGeneratePrompt } from "./knowledge-point";
import { type BuildScenarioFromDialoguePromptParams, buildScenarioFromDialoguePrompt } from "./scenario-from-dialogue";
import {
	type BuildScenarioOverviewGeneratePromptParams,
	buildScenarioOverviewGeneratePrompt,
} from "./scenario-overview";
import { type BuildSessionAnalysisPromptParams, buildSessionAnalysisPrompt } from "./session-analysis";

export type PromptRegistry = {
	sessionAnalysis: (params: BuildSessionAnalysisPromptParams) => {
		system: string;
		prompt: string;
	};
	knowledgePointGenerate: (params: BuildKnowledgePointGeneratePromptParams) => {
		system: string;
		prompt: string;
	};
	scenarioOverviewGenerate: (params: BuildScenarioOverviewGeneratePromptParams) => { system: string; prompt: string };
	scenarioFromDialogue: (params: BuildScenarioFromDialoguePromptParams) => {
		system: string;
		prompt: string;
	};
};

const registry: PromptRegistry = {
	sessionAnalysis: buildSessionAnalysisPrompt,
	knowledgePointGenerate: buildKnowledgePointGeneratePrompt,
	scenarioOverviewGenerate: buildScenarioOverviewGeneratePrompt,
	scenarioFromDialogue: buildScenarioFromDialoguePrompt,
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
