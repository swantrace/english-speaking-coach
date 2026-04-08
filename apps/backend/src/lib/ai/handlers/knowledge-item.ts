import {
  // type BuildKnowledgePointGeneratePromptParams,
  buildKnowledgeItemGeneratePrompt,
  // KnowledgeItemGenerateSchema,
  // KnowledgePointGenerateSchema,
} from "@english-coach/prompts";
import { generateText, Output } from "ai";
import z from "zod";
import type { ProviderContext } from "../provider";

type BuildKnowledgeItemGeneratePromptParams = {
  provider: string;
};

const KnowledgeItemGenerateSchema = z.object({
  phrase: z.string(),
  explanation: z.string(),
});

export function createKnowledgeItemHandler(ctx: ProviderContext) {
  return async function knowledgePoints(
    model: string,
    _payload: Omit<BuildKnowledgeItemGeneratePromptParams, "provider">,
  ) {
    const { system, prompt } = buildKnowledgeItemGeneratePrompt();

    const lm = ctx.languageModel(ctx.providerId, model);
    const result = await generateText({
      model: lm,
      output: Output.object({
        schema: KnowledgeItemGenerateSchema,
      }),
      system,
      prompt,
    });

    return { output: result.output };
  };
}
