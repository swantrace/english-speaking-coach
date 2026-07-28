import type { PromptModelContext } from "./types";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue | undefined };
type ProviderOptions = Record<string, { [key: string]: JsonValue | undefined }>;

export function providerOptionsForStructuredOutput({
  modelId,
  providerId,
}: PromptModelContext): ProviderOptions | undefined {
  if (providerId === "openai") {
    return {
      openai: {
        strictJsonSchema: false,
      },
    };
  }

  if (providerId === "qwen") {
    return {
      qwen: {
        strictJsonSchema: false,
      },
    };
  }

  if (providerId === "deepseek") {
    return {
      deepseek: {
        strictJsonSchema: false,
        thinking: {
          type: modelId.includes("v4-pro") ? "enabled" : "disabled",
        },
      },
    };
  }

  return undefined;
}
