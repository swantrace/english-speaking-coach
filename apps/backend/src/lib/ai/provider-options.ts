import type { PromptModelContext } from "./types";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue | undefined };
type ProviderOptions = Record<string, { [key: string]: JsonValue | undefined }>;

export function providerOptionsForStructuredOutput({ providerId }: PromptModelContext): ProviderOptions | undefined {
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

  return undefined;
}
