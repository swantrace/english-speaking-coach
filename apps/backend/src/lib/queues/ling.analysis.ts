import { openai } from "@ai-sdk/openai";
import {
  communicativeFunctions,
  errorDimensions,
  fixednessLevels,
  type LingAnalysisResult,
  lingAnalysisJobName,
  lingAnalysisQueueName,
  lingAnalysisResultSchema,
  syntaxRoles,
} from "@english-coach/contract";
import { db } from "@english-coach/database";
import {
  knowledgeItems,
  sessionErrors,
  sessionHistory,
  sessionKnowledgeItems,
  sessionTranscripts,
} from "@english-coach/database/schema";
import { generateObject } from "ai";
import { Queue, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { producerRedis, workerRedis } from "../redis";

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
      review:
        "Clear effort with useful request language. Keep adding articles and model the full request form consistently.",
    });
  }

  const { object } = await generateObject({
    model: openai(process.env.LING_ANALYSIS_MODEL ?? "gpt-4.1-mini"),
    prompt: [
      "You are analyzing a completed English coaching session transcript.",
      "Return one combined structured object with knowledge items, learner errors, and a markdown review.",
      `Valid syntaxRole values: ${syntaxRoles.join(", ")}`,
      `Valid fixednessLevel values: ${fixednessLevels.join(", ")}`,
      `Valid communicativeFunction values: ${communicativeFunctions.join(", ")}`,
      `Valid error dimensions: ${errorDimensions.join(", ")}`,
      "Extract knowledge items from both user and agent turns. Use speaker='user' for active learner production and speaker='agent' for target language modelled by the coach.",
      "Only report genuine learner errors for user utterances.",
      JSON.stringify(turns),
    ].join("\n\n"),
    schema: lingAnalysisResultSchema,
  });

  return object;
}

async function resolveKnowledgeItemId(result: LingAnalysisResult["knowledgeItemsUsed"][number]) {
  const now = new Date().toISOString();
  const [existing] = await db.select().from(knowledgeItems).where(eq(knowledgeItems.pattern, result.pattern)).limit(1);

  if (existing) {
    if (existing.source !== "admin") {
      await db
        .update(knowledgeItems)
        .set({
          communicativeFunction: result.communicativeFunction,
          example: result.example,
          fixednessLevel: result.fixednessLevel,
          syntaxRole: result.syntaxRole,
          updatedAt: now,
        })
        .where(eq(knowledgeItems.id, existing.id));
    }

    return existing.id;
  }

  const knowledgeItemId = crypto.randomUUID();

  await db.insert(knowledgeItems).values({
    communicativeFunction: result.communicativeFunction,
    createdAt: now,
    example: result.example,
    fixednessLevel: result.fixednessLevel,
    id: knowledgeItemId,
    pattern: result.pattern,
    source: "auto_generated",
    syntaxRole: result.syntaxRole,
    updatedAt: now,
  });

  return knowledgeItemId;
}

export const lingAnalysisWorker = new Worker<{ sessionHistoryId: string }>(
  lingAnalysisQueueName,
  async (job) => {
    const sessionHistoryId = job.data.sessionHistoryId;
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
      await transaction
        .delete(sessionKnowledgeItems)
        .where(eq(sessionKnowledgeItems.sessionHistoryId, sessionHistoryId));
      await transaction.delete(sessionErrors).where(eq(sessionErrors.sessionHistoryId, sessionHistoryId));

      for (const item of analysis.knowledgeItemsUsed) {
        const knowledgeItemId = await resolveKnowledgeItemId(item);

        await transaction.insert(sessionKnowledgeItems).values({
          count: item.count,
          examples: item.usageExcerpts,
          id: crypto.randomUUID(),
          knowledgeItemId,
          sessionHistoryId,
          speaker: item.speaker,
        });
      }

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

    return analysis;
  },
  {
    connection: workerRedis,
  },
);

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
