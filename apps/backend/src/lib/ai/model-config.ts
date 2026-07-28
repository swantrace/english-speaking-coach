import { type ProviderId, providerIds } from "./registry";

export type AiModelConfig = {
  KNOWLEDGE_GENERATE_MODEL: string;
  LING_ANALYSIS_MODEL: string;
  SCENARIO_GENERATE_MODEL: string;
  SCENARIO_STORY_MODEL: string;
  SCENARIO_GOALS_MODEL: string;
  SCENARIO_DIALOGUE_MODEL: string;
  CONVERSATION_ANALYSIS_MODEL: string;
};

export type ScenarioGenerationModelRoutes = {
  story: ModelRoute;
  goals: ModelRoute;
  dialogue: ModelRoute;
};

export type ModelRoute = {
  modelId: string;
  providerId: ProviderId;
};

function providerModelEnv(providerId: ProviderId, key: keyof AiModelConfig, fallback: string) {
  const providerKey = `${providerId.toUpperCase()}_${key}` as const;

  return process.env[providerKey] ?? process.env[key] ?? fallback;
}

function scenarioStepModelEnv(
  providerId: ProviderId,
  key: "SCENARIO_STORY_MODEL" | "SCENARIO_GOALS_MODEL" | "SCENARIO_DIALOGUE_MODEL",
  fallback: string,
) {
  const providerKey = `${providerId.toUpperCase()}_${key}` as const;
  const providerScenarioKey = `${providerId.toUpperCase()}_SCENARIO_GENERATE_MODEL` as const;

  return process.env[providerKey] ?? process.env[key] ?? process.env[providerScenarioKey] ?? fallback;
}

export const modelConfig: Record<ProviderId, AiModelConfig> = {
  openai: {
    KNOWLEDGE_GENERATE_MODEL: providerModelEnv("openai", "KNOWLEDGE_GENERATE_MODEL", "gpt-5.4-mini"),
    LING_ANALYSIS_MODEL: providerModelEnv("openai", "LING_ANALYSIS_MODEL", "gpt-5.6-terra"),
    SCENARIO_GENERATE_MODEL: providerModelEnv("openai", "SCENARIO_GENERATE_MODEL", "gpt-5.4-mini"),
    SCENARIO_STORY_MODEL: scenarioStepModelEnv("openai", "SCENARIO_STORY_MODEL", "gpt-5.4-mini"),
    SCENARIO_GOALS_MODEL: scenarioStepModelEnv("openai", "SCENARIO_GOALS_MODEL", "gpt-5.4-mini"),
    SCENARIO_DIALOGUE_MODEL: scenarioStepModelEnv("openai", "SCENARIO_DIALOGUE_MODEL", "gpt-5.4-mini"),
    CONVERSATION_ANALYSIS_MODEL: providerModelEnv("openai", "CONVERSATION_ANALYSIS_MODEL", "gpt-5.4-nano"),
  },
  qwen: {
    KNOWLEDGE_GENERATE_MODEL: providerModelEnv("qwen", "KNOWLEDGE_GENERATE_MODEL", "qwen3.7-plus"),
    LING_ANALYSIS_MODEL: providerModelEnv("qwen", "LING_ANALYSIS_MODEL", "qwen3.7-plus"),
    SCENARIO_GENERATE_MODEL: providerModelEnv("qwen", "SCENARIO_GENERATE_MODEL", "qwen3.7-plus"),
    SCENARIO_STORY_MODEL: scenarioStepModelEnv("qwen", "SCENARIO_STORY_MODEL", "qwen3.7-plus"),
    SCENARIO_GOALS_MODEL: scenarioStepModelEnv("qwen", "SCENARIO_GOALS_MODEL", "qwen3.7-plus"),
    SCENARIO_DIALOGUE_MODEL: scenarioStepModelEnv("qwen", "SCENARIO_DIALOGUE_MODEL", "qwen3.7-plus"),
    CONVERSATION_ANALYSIS_MODEL: providerModelEnv("qwen", "CONVERSATION_ANALYSIS_MODEL", "qwen3.6-flash"),
  },
  deepseek: {
    KNOWLEDGE_GENERATE_MODEL: providerModelEnv("deepseek", "KNOWLEDGE_GENERATE_MODEL", "deepseek-v4-flash"),
    LING_ANALYSIS_MODEL: providerModelEnv("deepseek", "LING_ANALYSIS_MODEL", "deepseek-v4-pro"),
    SCENARIO_GENERATE_MODEL: providerModelEnv("deepseek", "SCENARIO_GENERATE_MODEL", "deepseek-v4-flash"),
    SCENARIO_STORY_MODEL: scenarioStepModelEnv("deepseek", "SCENARIO_STORY_MODEL", "deepseek-v4-flash"),
    SCENARIO_GOALS_MODEL: scenarioStepModelEnv("deepseek", "SCENARIO_GOALS_MODEL", "deepseek-v4-pro"),
    SCENARIO_DIALOGUE_MODEL: scenarioStepModelEnv("deepseek", "SCENARIO_DIALOGUE_MODEL", "deepseek-v4-flash"),
    CONVERSATION_ANALYSIS_MODEL: providerModelEnv("deepseek", "CONVERSATION_ANALYSIS_MODEL", "deepseek-v4-flash"),
  },
};

function resolveStepProvider(
  env: NodeJS.ProcessEnv,
  name: "SCENARIO_STORY_PROVIDER_ID" | "SCENARIO_GOALS_PROVIDER_ID" | "SCENARIO_DIALOGUE_PROVIDER_ID",
  fallback: ProviderId,
) {
  const value = env[name]?.trim() || fallback;

  if (!providerIds.includes(value as ProviderId)) {
    throw new Error(`Invalid ${name} "${value}". Expected one of: ${providerIds.join(", ")}`);
  }

  return value as ProviderId;
}

export function resolveScenarioGenerationModelRoutes(
  defaultProviderId: ProviderId,
  env: NodeJS.ProcessEnv = process.env,
): ScenarioGenerationModelRoutes {
  const storyProviderId = resolveStepProvider(env, "SCENARIO_STORY_PROVIDER_ID", defaultProviderId);
  const goalsProviderId = resolveStepProvider(env, "SCENARIO_GOALS_PROVIDER_ID", defaultProviderId);
  const dialogueProviderId = resolveStepProvider(env, "SCENARIO_DIALOGUE_PROVIDER_ID", defaultProviderId);

  return {
    story: {
      modelId: env.SCENARIO_STORY_MODEL?.trim() || modelConfig[storyProviderId].SCENARIO_STORY_MODEL,
      providerId: storyProviderId,
    },
    goals: {
      modelId: env.SCENARIO_GOALS_MODEL?.trim() || modelConfig[goalsProviderId].SCENARIO_GOALS_MODEL,
      providerId: goalsProviderId,
    },
    dialogue: {
      modelId: env.SCENARIO_DIALOGUE_MODEL?.trim() || modelConfig[dialogueProviderId].SCENARIO_DIALOGUE_MODEL,
      providerId: dialogueProviderId,
    },
  };
}

export const defaultModelProviderConfig = modelConfig;
