import { errorDimensions } from "@english-coach/contract/common";
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
import { type AiRequestLogContext, recordAiModelRequest } from "../request-logging";

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
    async generateLingAnalysis(
      modelId: string,
      payload: GenerateLingAnalysisInput,
      context?: AiRequestLogContext,
    ): Promise<LingAnalysisResult> {
      const { prompt, system } = buildLingAnalysisPrompt({
        modelId,
        providerId,
        errorDimensions,
        turns: payload.turns,
      });

      const { output } = await recordAiModelRequest({
        context: {
          ...context,
          metadata: {
            ...context?.metadata,
            turnCount: payload.turns.length,
          },
        },
        input: { prompt, system },
        modelId,
        operation: "session.analysis.ling",
        providerId,
        run: () =>
          generateText({
            providerOptions: providerOptionsForStructuredOutput({ modelId, providerId }),
            model: languageModel(providerId, modelId),
            output: Output.object({
              schema: lingAnalysisResultSchema,
            }),
            system,
            prompt,
          }),
      });

      return output;
    },

    async generateInConversationAnalysis(
      modelId: string,
      payload: GenerateInConversationAnalysisInput,
      context?: AiRequestLogContext,
    ): Promise<InConversationAnalysisResult> {
      const { prompt, system } = buildInConversationAnalysisPrompt({ modelId, providerId, ...payload });

      const { output } = await recordAiModelRequest({
        context: {
          ...context,
          metadata: {
            ...context?.metadata,
            turnCount: payload.indexedTurns.length,
          },
        },
        input: { prompt, system },
        modelId,
        operation: "session.analysis.in_conversation",
        providerId,
        run: () =>
          generateText({
            providerOptions: providerOptionsForStructuredOutput({ modelId, providerId }),
            model: languageModel(providerId, modelId),
            output: Output.object({
              schema: inConversationAnalysisResultSchema,
            }),
            system,
            prompt,
          }),
      });

      return output;
    },
  };
}
