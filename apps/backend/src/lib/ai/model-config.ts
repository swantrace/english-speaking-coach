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

export type AsyncModelRoutes = {
  conversationAnalysis: ModelRoute;
  knowledgeGeneration: ModelRoute;
  lingAnalysis: ModelRoute;
  scenario: ScenarioGenerationModelRoutes;
};

export const recommendedAsyncModelRoutes: AsyncModelRoutes = {
  conversationAnalysis: {
    modelId: "deepseek-v4-flash",
    providerId: "deepseek",
  },
  knowledgeGeneration: {
    modelId: "gpt-5.6-terra",
    providerId: "openai",
  },
  lingAnalysis: {
    modelId: "gpt-5.6-sol",
    providerId: "openai",
  },
  scenario: {
    dialogue: {
      modelId: "qwen3.7-plus",
      providerId: "qwen",
    },
    goals: {
      modelId: "gpt-5.6-terra",
      providerId: "openai",
    },
    story: {
      modelId: "qwen3.7-plus",
      providerId: "qwen",
    },
  },
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
    KNOWLEDGE_GENERATE_MODEL: providerModelEnv("openai", "KNOWLEDGE_GENERATE_MODEL", "gpt-5.6-terra"),
    LING_ANALYSIS_MODEL: providerModelEnv("openai", "LING_ANALYSIS_MODEL", "gpt-5.6-terra"),
    SCENARIO_GENERATE_MODEL: providerModelEnv("openai", "SCENARIO_GENERATE_MODEL", "gpt-5.6-terra"),
    SCENARIO_STORY_MODEL: scenarioStepModelEnv("openai", "SCENARIO_STORY_MODEL", "gpt-5.6-terra"),
    SCENARIO_GOALS_MODEL: scenarioStepModelEnv("openai", "SCENARIO_GOALS_MODEL", "gpt-5.6-terra"),
    SCENARIO_DIALOGUE_MODEL: scenarioStepModelEnv("openai", "SCENARIO_DIALOGUE_MODEL", "gpt-5.6-terra"),
    CONVERSATION_ANALYSIS_MODEL: providerModelEnv("openai", "CONVERSATION_ANALYSIS_MODEL", "gpt-5.6-luna"),
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

function resolveModelRoute(
  env: NodeJS.ProcessEnv,
  providerEnvName: string,
  modelEnvName: string,
  modelConfigKey: keyof AiModelConfig,
  fallback: ModelRoute,
): ModelRoute {
  const providerId = env[providerEnvName]?.trim() || fallback.providerId;

  if (!providerIds.includes(providerId as ProviderId)) {
    throw new Error(`Invalid ${providerEnvName} "${providerId}". Expected one of: ${providerIds.join(", ")}`);
  }

  return {
    modelId:
      env[modelEnvName]?.trim() ||
      (providerId === fallback.providerId ? fallback.modelId : modelConfig[providerId as ProviderId][modelConfigKey]),
    providerId: providerId as ProviderId,
  };
}

export function resolveKnowledgeGenerationModelRoute(env: NodeJS.ProcessEnv = process.env): ModelRoute {
  return resolveModelRoute(
    env,
    "KNOWLEDGE_GENERATE_PROVIDER_ID",
    "KNOWLEDGE_GENERATE_MODEL",
    "KNOWLEDGE_GENERATE_MODEL",
    recommendedAsyncModelRoutes.knowledgeGeneration,
  );
}

export function resolveLingAnalysisModelRoute(env: NodeJS.ProcessEnv = process.env): ModelRoute {
  return resolveModelRoute(
    env,
    "LING_ANALYSIS_PROVIDER_ID",
    "LING_ANALYSIS_MODEL",
    "LING_ANALYSIS_MODEL",
    recommendedAsyncModelRoutes.lingAnalysis,
  );
}

export function resolveConversationAnalysisModelRoute(env: NodeJS.ProcessEnv = process.env): ModelRoute {
  return resolveModelRoute(
    env,
    "CONVERSATION_ANALYSIS_PROVIDER_ID",
    "CONVERSATION_ANALYSIS_MODEL",
    "CONVERSATION_ANALYSIS_MODEL",
    recommendedAsyncModelRoutes.conversationAnalysis,
  );
}

export function resolveScenarioGenerationModelRoutes(
  env: NodeJS.ProcessEnv = process.env,
): ScenarioGenerationModelRoutes {
  const storyProviderId = resolveStepProvider(
    env,
    "SCENARIO_STORY_PROVIDER_ID",
    recommendedAsyncModelRoutes.scenario.story.providerId,
  );
  const goalsProviderId = resolveStepProvider(
    env,
    "SCENARIO_GOALS_PROVIDER_ID",
    recommendedAsyncModelRoutes.scenario.goals.providerId,
  );
  const dialogueProviderId = resolveStepProvider(
    env,
    "SCENARIO_DIALOGUE_PROVIDER_ID",
    recommendedAsyncModelRoutes.scenario.dialogue.providerId,
  );

  return {
    story: {
      modelId:
        env.SCENARIO_STORY_MODEL?.trim() ||
        (storyProviderId === recommendedAsyncModelRoutes.scenario.story.providerId
          ? recommendedAsyncModelRoutes.scenario.story.modelId
          : modelConfig[storyProviderId].SCENARIO_STORY_MODEL),
      providerId: storyProviderId,
    },
    goals: {
      modelId:
        env.SCENARIO_GOALS_MODEL?.trim() ||
        (goalsProviderId === recommendedAsyncModelRoutes.scenario.goals.providerId
          ? recommendedAsyncModelRoutes.scenario.goals.modelId
          : modelConfig[goalsProviderId].SCENARIO_GOALS_MODEL),
      providerId: goalsProviderId,
    },
    dialogue: {
      modelId:
        env.SCENARIO_DIALOGUE_MODEL?.trim() ||
        (dialogueProviderId === recommendedAsyncModelRoutes.scenario.dialogue.providerId
          ? recommendedAsyncModelRoutes.scenario.dialogue.modelId
          : modelConfig[dialogueProviderId].SCENARIO_DIALOGUE_MODEL),
      providerId: dialogueProviderId,
    },
  };
}

export const defaultModelProviderConfig = modelConfig;
