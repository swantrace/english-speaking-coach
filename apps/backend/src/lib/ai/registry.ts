import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createProviderRegistry } from "ai";

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const qwen = createOpenAICompatible({
  name: "qwen",
  baseURL: process.env.QWEN_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1",
  apiKey: process.env.QWEN_API_KEY,
  supportsStructuredOutputs: true,
});

export const registry = createProviderRegistry({
  openai,
  qwen,
});

export const providerIds = ["openai", "qwen"] as const;

export type ProviderId = (typeof providerIds)[number];

export function isProviderId(value: string): value is ProviderId {
  return providerIds.includes(value as ProviderId);
}

// Convenience for building language models in a unified way.
export function languageModel(providerId: ProviderId, modelId: string): ReturnType<typeof registry.languageModel> {
  return registry.languageModel(`${providerId}:${modelId}`);
}

export function speechModel(providerId: ProviderId, modelId: string): ReturnType<typeof registry.speechModel> {
  return registry.speechModel(`${providerId}:${modelId}`);
}

export function transcriptionModel(
  providerId: ProviderId,
  modelId: string,
): ReturnType<typeof registry.transcriptionModel> {
  return registry.transcriptionModel(`${providerId}:${modelId}`);
}
