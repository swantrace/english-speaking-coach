import { describe, expect, test } from "bun:test";

import { providerOptionsForStructuredOutput } from "./provider-options";

describe("providerOptionsForStructuredOutput", () => {
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
