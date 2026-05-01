import { type ProviderId, providerIds } from "./registry";

export type AiModelConfig = {
  KNOWLEDGE_GENERATE_MODEL: string;
  LING_ANALYSIS_MODEL: string;
  SCENARIO_GENERATE_MODEL: string;
};

function providerModelEnv(providerId: ProviderId, key: keyof AiModelConfig, fallback: string) {
  const providerKey = `${providerId.toUpperCase()}_${key}` as const;

  return process.env[providerKey] ?? process.env[key] ?? fallback;
}

export const modelConfig: Record<ProviderId, AiModelConfig> = {
  openai: {
    KNOWLEDGE_GENERATE_MODEL: providerModelEnv("openai", "KNOWLEDGE_GENERATE_MODEL", "gpt-4.1-mini"),
    LING_ANALYSIS_MODEL: providerModelEnv("openai", "LING_ANALYSIS_MODEL", "gpt-4.1-mini"),
    SCENARIO_GENERATE_MODEL: providerModelEnv("openai", "SCENARIO_GENERATE_MODEL", "gpt-4.1-mini"),
  },
  qwen: {
    KNOWLEDGE_GENERATE_MODEL: providerModelEnv("qwen", "KNOWLEDGE_GENERATE_MODEL", "qwen-2.2-mini"),
    LING_ANALYSIS_MODEL: providerModelEnv("qwen", "LING_ANALYSIS_MODEL", "qwen-2.2-mini"),
    SCENARIO_GENERATE_MODEL: providerModelEnv("qwen", "SCENARIO_GENERATE_MODEL", "qwen-2.2-mini"),
  },
};

export const defaultModelProviderConfig = modelConfig;
