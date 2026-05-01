import { adminKnowledgeCreateSchema } from "@english-coach/contract/knowledge";
import { buildKnowledgeItemFromOccurrencePrompt, buildKnowledgeItemGeneratePrompt } from "@english-coach/prompts";
import { generateText, Output } from "ai";
import type { z } from "zod";
import { providerOptionsForStructuredOutput } from "../provider-options";
import { languageModel, type ProviderId } from "../registry";

const generatedKnowledgeItemSchema = adminKnowledgeCreateSchema.omit({
  isPendingReview: true,
});

const modelGeneratedKnowledgeItemSchema = generatedKnowledgeItemSchema.extend({
  pattern: generatedKnowledgeItemSchema.shape.pattern.optional(),
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
    async generateKnowledgeItem(modelId: string, payload: GenerateKnowledgeItemInput): Promise<GeneratedKnowledgeItem> {
      const { prompt, system } = buildKnowledgeItemGeneratePrompt({ modelId, providerId, ...payload });

      const { output } = await generateText({
        providerOptions: providerOptionsForStructuredOutput({ modelId, providerId }),
        model: languageModel(providerId, modelId),
        output: Output.object({
          schema: modelGeneratedKnowledgeItemSchema,
        }),
        system,
        prompt,
      });

      return generatedKnowledgeItemSchema.parse({
        ...output,
        pattern: normalizePatternValue(output.pattern),
      });
    },

    async generateKnowledgeItemFromOccurrence(
      modelId: string,
      payload: GenerateKnowledgeItemFromOccurrenceInput,
    ): Promise<GeneratedKnowledgeItem> {
      const { prompt, system } = buildKnowledgeItemFromOccurrencePrompt({ modelId, providerId, ...payload });

      const { output } = await generateText({
        providerOptions: providerOptionsForStructuredOutput({ modelId, providerId }),
        model: languageModel(providerId, modelId),
        output: Output.object({
          schema: generatedKnowledgeItemSchema,
        }),
        system,
        prompt,
      });

      return generatedKnowledgeItemSchema.parse({
        ...output,
        pattern: output.pattern?.trim() || payload.proposedPattern,
      });
    },
  };
}
