import OpenAI from "openai";
import { languageModel, type ProviderId, registry, speechModel, transcriptionModel } from "./registry";

export interface AppLlmProvider {
  id: ProviderId;
  // generateKnowledgeItemObject: ReturnType<typeof createKnowledgeItemHandler>;
  // generateScenarioStoryObject: ReturnType<typeof createScenarioStoryHandler>;
  // generateScenarioGoalsObject: ReturnType<typeof createScenarioGoalsHandler>;
  // generateScenarioExampleDialogueObject: ReturnType<typeof createScenarioExampleDialogueHandler>;
  // generateSessionReviewObject: ReturnType<typeof createSessionReviewHandler>;
  // generateInConversationAnalysisObject: ReturnType<typeof createInConversationAnalysisHandler>;
}

export interface ProviderContext {
  providerId: ProviderId;
  registry: typeof registry;
  languageModel: typeof languageModel;
  speechModel: typeof speechModel;
  transcriptionModel: typeof transcriptionModel;
  lib: unknown;
}

const providerCache = new Map<ProviderId, AppLlmProvider>();

export function getProvider(id: ProviderId): AppLlmProvider {
  if (providerCache.has(id)) {
    // biome-ignore lint/style/noNonNullAssertion: we check has() above, so this is safe
    return providerCache.get(id)!;
  }

  const ctx = {
    providerId: id,
    registry,
    languageModel,
    speechModel,
    transcriptionModel,
  } as ProviderContext;

  if (id === "openai") {
    ctx.lib = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  const provider = {
    id,
    // generateKnowledgeItemObject: createKnowledgeItemHandler(ctx),
    // generateScenarioStoryObject: createScenarioStoryHandler(ctx),
    // generateScenarioGoalsObject: createScenarioGoalsHandler(ctx),
    // generateScenarioExampleDialogueObject: createScenarioExampleDialogueHandler(ctx),
    // generateSessionReviewObject: createSessionReviewHandler(ctx),
    // generateInConversationAnalysisObject: createInConversationAnalysisHandler(ctx),
  };

  providerCache.set(id, provider);
  return provider;
}
