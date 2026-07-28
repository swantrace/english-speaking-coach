import { describe, expect, test } from "bun:test";

import {
  resolveConversationAnalysisModelRoute,
  resolveKnowledgeGenerationModelRoute,
  resolveLingAnalysisModelRoute,
  resolveScenarioGenerationModelRoutes,
} from "./model-config";

describe("resolveScenarioGenerationModelRoutes", () => {
  test("uses the recommended provider and model for each step by default", () => {
    expect(resolveScenarioGenerationModelRoutes({})).toEqual({
      dialogue: { modelId: "qwen3.7-plus", providerId: "qwen" },
      goals: { modelId: "gpt-5.6-terra", providerId: "openai" },
      story: { modelId: "qwen3.7-plus", providerId: "qwen" },
    });
  });

  test("allows every scenario step to use a different provider and model", () => {
    expect(
      resolveScenarioGenerationModelRoutes({
        SCENARIO_DIALOGUE_MODEL: "deepseek-v4-flash",
        SCENARIO_DIALOGUE_PROVIDER_ID: "deepseek",
        SCENARIO_GOALS_MODEL: "qwen3.7-plus",
        SCENARIO_GOALS_PROVIDER_ID: "qwen",
        SCENARIO_STORY_MODEL: "gpt-5.4-mini",
        SCENARIO_STORY_PROVIDER_ID: "openai",
      }),
    ).toEqual({
      dialogue: { modelId: "deepseek-v4-flash", providerId: "deepseek" },
      goals: { modelId: "qwen3.7-plus", providerId: "qwen" },
      story: { modelId: "gpt-5.4-mini", providerId: "openai" },
    });
  });

  test("rejects an unknown step provider", () => {
    expect(() =>
      resolveScenarioGenerationModelRoutes({
        SCENARIO_GOALS_PROVIDER_ID: "unknown",
      }),
    ).toThrow('Invalid SCENARIO_GOALS_PROVIDER_ID "unknown"');
  });
});

describe("asynchronous model routes", () => {
  test("uses quality-tiered defaults for each workload", () => {
    expect(resolveKnowledgeGenerationModelRoute({})).toEqual({
      modelId: "gpt-5.6-terra",
      providerId: "openai",
    });
    expect(resolveLingAnalysisModelRoute({})).toEqual({
      modelId: "gpt-5.6-sol",
      providerId: "openai",
    });
    expect(resolveConversationAnalysisModelRoute({})).toEqual({
      modelId: "deepseek-v4-flash",
      providerId: "deepseek",
    });
  });

  test("allows task-specific provider and model overrides", () => {
    expect(
      resolveLingAnalysisModelRoute({
        LING_ANALYSIS_MODEL: "qwen3.7-max",
        LING_ANALYSIS_PROVIDER_ID: "qwen",
      }),
    ).toEqual({
      modelId: "qwen3.7-max",
      providerId: "qwen",
    });
  });

  test("uses the selected provider's default when only the provider is overridden", () => {
    expect(resolveKnowledgeGenerationModelRoute({ KNOWLEDGE_GENERATE_PROVIDER_ID: "deepseek" })).toEqual({
      modelId: "deepseek-v4-flash",
      providerId: "deepseek",
    });
  });
});
