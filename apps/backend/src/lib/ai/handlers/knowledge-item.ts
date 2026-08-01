import { communicativeFunctions, fixednessLevels, patternTypes } from "@english-coach/contract/common";
import { adminKnowledgeCreateSchema, knowledgeSenseSchema } from "@english-coach/contract/knowledge";
import { buildKnowledgeItemFromOccurrencePrompt, buildKnowledgeItemGeneratePrompt } from "@english-coach/prompts";
import { generateText, Output } from "ai";
import { z } from "zod";
import { providerOptionsForStructuredOutput } from "../provider-options";
import { languageModel, type ProviderId } from "../registry";
import { type AiRequestLogContext, recordAiModelRequest } from "../request-logging";

const generatedKnowledgeItemSchema = adminKnowledgeCreateSchema
  .omit({
    isPendingReview: true,
  })
  .extend({
    senses: z.array(knowledgeSenseSchema).min(1),
    patternType: z.enum(patternTypes),
  });

const modelGeneratedKnowledgeItemSchema = generatedKnowledgeItemSchema.extend({
  pattern: generatedKnowledgeItemSchema.shape.pattern.optional(),
});

const generatedKnowledgeOccurrenceDraftSchema = generatedKnowledgeItemSchema.extend({
  communicativeFunction: z.enum(communicativeFunctions).nullable(),
  fixednessLevel: z.enum(fixednessLevels).nullable(),
});

export type GeneratedKnowledgeItem = z.output<typeof generatedKnowledgeItemSchema>;

export type GenerateKnowledgeItemInput = {
  input: string;
};

export type GenerateKnowledgeItemFromOccurrenceInput = {
  proposedPattern: string;
  utterance: string;
};

function normalizePatternValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : undefined;
}

export function createKnowledgeItemHandlers(providerId: ProviderId) {
  return {
    async generateKnowledgeItem(
      modelId: string,
      payload: GenerateKnowledgeItemInput,
      context?: AiRequestLogContext,
    ): Promise<GeneratedKnowledgeItem> {
      const { prompt, system } = buildKnowledgeItemGeneratePrompt({ modelId, providerId, ...payload });

      const { output } = await recordAiModelRequest({
        context: {
          ...context,
          metadata: {
            ...context?.metadata,
            payload,
          },
        },
        input: { prompt, system },
        modelId,
        operation: "knowledge.generate",
        providerId,
        run: () =>
          generateText({
            providerOptions: providerOptionsForStructuredOutput({ modelId, providerId }),
            model: languageModel(providerId, modelId),
            output: Output.object({
              schema: modelGeneratedKnowledgeItemSchema,
            }),
            system,
            prompt,
          }),
      });

      return generatedKnowledgeItemSchema.parse({
        ...output,
        pattern: normalizePatternValue(output.pattern),
      });
    },

    async generateKnowledgeItemFromOccurrence(
      modelId: string,
      payload: GenerateKnowledgeItemFromOccurrenceInput,
      context?: AiRequestLogContext,
    ): Promise<GeneratedKnowledgeItem> {
      const { prompt, system } = buildKnowledgeItemFromOccurrencePrompt({ modelId, providerId, ...payload });

      const { output } = await recordAiModelRequest({
        context: {
          ...context,
          metadata: {
            ...context?.metadata,
            payload,
          },
        },
        input: { prompt, system },
        modelId,
        operation: "knowledge.generate.from_occurrence",
        providerId,
        run: () =>
          generateText({
            providerOptions: providerOptionsForStructuredOutput({ modelId, providerId }),
            model: languageModel(providerId, modelId),
            output: Output.object({
              schema: generatedKnowledgeOccurrenceDraftSchema,
            }),
            system,
            prompt,
          }),
      });

      return generatedKnowledgeOccurrenceDraftSchema.parse({
        ...output,
        pattern: output.pattern?.trim() || payload.proposedPattern,
      });
    },
  };
}
