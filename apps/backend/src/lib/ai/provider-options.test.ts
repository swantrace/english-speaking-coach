import { describe, expect, test } from "bun:test";

import { providerOptionsForStructuredOutput } from "./provider-options";

describe("providerOptionsForStructuredOutput", () => {
  test("uses medium reasoning for OpenAI Sol", () => {
    expect(
      providerOptionsForStructuredOutput({
        modelId: "gpt-5.6-sol",
        providerId: "openai",
      }),
    ).toEqual({
      openai: {
        reasoningEffort: "medium",
        strictJsonSchema: false,
      },
    });
  });

  test("uses low reasoning for OpenAI Terra", () => {
    expect(
      providerOptionsForStructuredOutput({
        modelId: "gpt-5.6-terra",
        providerId: "openai",
      }),
    ).toEqual({
      openai: {
        reasoningEffort: "low",
        strictJsonSchema: false,
      },
    });
  });

  test("disables thinking for Qwen structured output", () => {
    expect(
      providerOptionsForStructuredOutput({
        modelId: "qwen3.7-plus",
        providerId: "qwen",
      }),
    ).toEqual({
      qwen: {
        enable_thinking: false,
        strictJsonSchema: false,
      },
    });
  });

  test("disables thinking for DeepSeek V4 Flash", () => {
    expect(
      providerOptionsForStructuredOutput({
        modelId: "deepseek-v4-flash",
        providerId: "deepseek",
      }),
    ).toEqual({
      deepseek: {
        strictJsonSchema: false,
        thinking: { type: "disabled" },
      },
    });
  });

  test("enables thinking for DeepSeek V4 Pro", () => {
    expect(
      providerOptionsForStructuredOutput({
        modelId: "deepseek-v4-pro",
        providerId: "deepseek",
      }),
    ).toEqual({
      deepseek: {
        strictJsonSchema: false,
        thinking: { type: "enabled" },
      },
    });
  });
});
