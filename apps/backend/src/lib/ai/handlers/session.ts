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
import { z } from "zod";
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

const inConversationAnalysisModelOutputSchema = z.object({
  uiPrompts: z
    .array(
      z.object({
        prompt: z.string().trim().min(1).optional().describe("Learner-facing coaching prompt. Use this exact key."),
        promptKind: z.enum(["error_hint", "knowledge_hint", "fluency_hint"]),
        text: z.string().trim().min(1).optional().describe("Legacy alias for prompt; do not use for new responses."),
        transcriptTurnIndex: z.number().int().min(0).optional(),
      }),
    )
    .min(0)
    .max(3),
  workerFeedbackMessage: z.string().trim().min(1),
});

export function normalizeInConversationAnalysisOutput(value: unknown): InConversationAnalysisResult {
  const parsed = inConversationAnalysisModelOutputSchema.parse(value);

  return inConversationAnalysisResultSchema.parse({
    uiPrompts: parsed.uiPrompts.map(({ prompt, promptKind, text, transcriptTurnIndex }) => ({
      prompt: prompt ?? text,
      promptKind,
      transcriptTurnIndex,
    })),
    workerFeedbackMessage: parsed.workerFeedbackMessage,
  });
}

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
              description: "Compact live English-coaching feedback as a JSON object.",
              name: "inConversationAnalysis",
              schema: inConversationAnalysisModelOutputSchema,
            }),
            system,
            prompt,
          }),
      });

      return normalizeInConversationAnalysisOutput(output);
    },
  };
}
