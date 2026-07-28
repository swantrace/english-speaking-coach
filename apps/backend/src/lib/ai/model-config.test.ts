import { describe, expect, test } from "bun:test";

import { resolveScenarioGenerationModelRoutes } from "./model-config";

describe("resolveScenarioGenerationModelRoutes", () => {
  test("uses one provider for every step by default", () => {
    expect(resolveScenarioGenerationModelRoutes("openai", {})).toEqual({
      dialogue: { modelId: "gpt-5.4-mini", providerId: "openai" },
      goals: { modelId: "gpt-5.4-mini", providerId: "openai" },
      story: { modelId: "gpt-5.4-mini", providerId: "openai" },
    });
  });

  test("allows every scenario step to use a different provider and model", () => {
    expect(
      resolveScenarioGenerationModelRoutes("openai", {
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
      resolveScenarioGenerationModelRoutes("openai", {
        SCENARIO_GOALS_PROVIDER_ID: "unknown",
      }),
    ).toThrow('Invalid SCENARIO_GOALS_PROVIDER_ID "unknown"');
  });
});
