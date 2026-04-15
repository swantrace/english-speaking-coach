import { openai } from "@ai-sdk/openai";
import { communicativeFunctions, errorDimensions, fixednessLevels, syntaxRoles } from "@english-coach/contract/common";
import {
  type LingAnalysisResult,
  lingAnalysisJobName,
  lingAnalysisQueueName,
  lingAnalysisResultSchema,
} from "@english-coach/contract/session";
import { db } from "@english-coach/database";
import { knowledgeItems, sessionErrors, sessionHistory, sessionTranscripts } from "@english-coach/database/schema";
import { generateText, Output } from "ai";
import { Queue, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { producerRedis, workerRedis } from "../redis";
import { persistRewrittenTranscriptTurnsForSession } from "./in-conversation.analysis";

type TranscriptTurns = typeof sessionTranscripts.$inferSelect.turns;

export const lingAnalysisQueue = new Queue<{ sessionHistoryId: string }>(lingAnalysisQueueName, {
  connection: producerRedis,
});

let lingAnalysisGeneratorOverride: ((turns: TranscriptTurns) => Promise<LingAnalysisResult>) | null = null;

async function generateLingAnalysis(turns: TranscriptTurns) {
  if (lingAnalysisGeneratorOverride) {
    return lingAnalysisGeneratorOverride(turns);
  }

  if (process.env.LING_ANALYSIS_USE_TEST_GENERATOR === "1") {
    return lingAnalysisResultSchema.parse({
      errors: [
        {
          dimension: "syntactic",
          errorDescription: "Missing article before the noun phrase.",
          suggestion: "Say 'I'd like a coffee' instead.",
          utterance: "I'd like coffee",
        },
      ],
      knowledgeItemsUsed: [
        {
          communicativeFunction: "make_request_or_offer",
          count: 1,
          example: "I'd like a coffee, please.",
          fixednessLevel: "fixed_expression",
          pattern: "I'd like <np>",
          speaker: "user",
          syntaxRole: "clause_pattern",
          usageExcerpts: ["I'd like coffee"],
        },
      ],
      rewrittenUserTurns: [{ text: "I went to the store.", transcriptTurnIndex: 0 }],
      review:
        "Clear effort with useful request language. Keep adding articles and model the full request form consistently.",
    });
  }

  const { output } = await generateText({
    model: openai(process.env.LING_ANALYSIS_MODEL ?? "gpt-4.1-mini"),
    output: Output.object({
      schema: lingAnalysisResultSchema,
    }),
    prompt: [
      "You are analyzing a completed English coaching session transcript.",
      "Return one combined structured object with knowledge items, learner errors, and a markdown review.",
      "Always include rewrittenUserTurns. If there are no rewrites to suggest, return rewrittenUserTurns as [].",
      `Valid syntaxRole values: ${syntaxRoles.join(", ")}`,
      `Valid fixednessLevel values: ${fixednessLevels.join(", ")}`,
      `Valid communicativeFunction values: ${communicativeFunctions.join(", ")}`,
      `Valid error dimensions: ${errorDimensions.join(", ")}`,
      "Extract knowledge items from both user and assistant turns. Use speaker='user' for active learner production and speaker='assistant' for target language modelled by the coach.",
      "Only report genuine learner errors for user utterances.",
      JSON.stringify(turns),
    ].join("\n\n"),
  });

  return output;
}

export const lingAnalysisWorker = new Worker<{ sessionHistoryId: string }>(
  lingAnalysisQueueName,
  async (job) => processLingAnalysisSession(job.data.sessionHistoryId),
  {
    connection: workerRedis,
  },
);

export async function processLingAnalysisSession(sessionHistoryId: string) {
  const [transcriptRecord] = await db
    .select()
    .from(sessionTranscripts)
    .where(eq(sessionTranscripts.sessionHistoryId, sessionHistoryId))
    .limit(1);

  if (!transcriptRecord) {
    throw new Error(`Transcript not found for session ${sessionHistoryId}`);
  }

  const analysis = await generateLingAnalysis(transcriptRecord.turns);
  await db.transaction(async (transaction) => {
    await transaction.delete(sessionErrors).where(eq(sessionErrors.sessionHistoryId, sessionHistoryId));

    if (analysis.errors.length > 0) {
      await transaction.insert(sessionErrors).values(
        analysis.errors.map((error) => ({
          dimension: error.dimension,
          errorDescription: error.errorDescription,
          id: crypto.randomUUID(),
          sessionHistoryId,
          suggestion: error.suggestion,
          utterance: error.utterance,
        })),
      );
    }

    await transaction
      .update(sessionHistory)
      .set({
        review: analysis.review,
      })
      .where(eq(sessionHistory.id, sessionHistoryId));
  });

  await persistRewrittenTranscriptTurnsForSession(sessionHistoryId, analysis.rewrittenUserTurns);

  return analysis;
}

lingAnalysisWorker.on("completed", (job) => {
  console.log(`${lingAnalysisJobName} job ${job.id} completed`);
});

lingAnalysisWorker.on("failed", (job, error) => {
  console.error(`${lingAnalysisJobName} job ${job?.id ?? "unknown"} failed`, error);
});

export function setLingAnalysisGeneratorForTests(
  generator: ((turns: TranscriptTurns) => Promise<LingAnalysisResult>) | null,
) {
  lingAnalysisGeneratorOverride = generator;
}
