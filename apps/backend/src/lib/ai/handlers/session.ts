import { communicativeFunctions, errorDimensions, fixednessLevels, patternTypes } from "@english-coach/contract/common";
import {
  type InConversationAnalysisResult,
  inConversationAnalysisResultSchema,
  type LingAnalysisResult,
  lingAnalysisResultSchema,
  type SessionTurn,
} from "@english-coach/contract/session";
import { buildInConversationAnalysisPrompt, buildLingAnalysisPrompt } from "@english-coach/prompts";
import { generateText, Output } from "ai";
import { providerOptionsForStructuredOutput } from "../provider-options";
import { languageModel, type ProviderId } from "../registry";

export type IndexedTranscriptTurn = SessionTurn & {
  transcriptTurnIndex: number;
};

export type GenerateLingAnalysisInput = {
  turns: SessionTurn[];
};

export type GenerateInConversationAnalysisInput = {
  indexedTurns: IndexedTranscriptTurn[];
};

export function createSessionHandlers(providerId: ProviderId) {
  return {
    async generateLingAnalysis(modelId: string, payload: GenerateLingAnalysisInput): Promise<LingAnalysisResult> {
      const { prompt, system } = buildLingAnalysisPrompt({
        modelId,
        providerId,
        communicativeFunctions,
        errorDimensions,
        fixednessLevels,
        patternTypes,
        turns: payload.turns,
      });

      const { output } = await generateText({
        providerOptions: providerOptionsForStructuredOutput({ modelId, providerId }),
        model: languageModel(providerId, modelId),
        output: Output.object({
          schema: lingAnalysisResultSchema,
        }),
        system,
        prompt,
      });

      return output;
    },

    async generateInConversationAnalysis(
      modelId: string,
      payload: GenerateInConversationAnalysisInput,
    ): Promise<InConversationAnalysisResult> {
      const { prompt, system } = buildInConversationAnalysisPrompt({ modelId, providerId, ...payload });

      const { output } = await generateText({
        providerOptions: providerOptionsForStructuredOutput({ modelId, providerId }),
        model: languageModel(providerId, modelId),
        output: Output.object({
          schema: inConversationAnalysisResultSchema,
        }),
        system,
        prompt,
      });

      return output;
    },
  };
}
