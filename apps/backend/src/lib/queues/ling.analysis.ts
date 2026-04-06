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
  type TranscriptAnnotation,
  transcriptAnnotationSchema,
} from "@english-coach/contract";
import { db } from "@english-coach/database";
import {
  knowledgeItems,
  sessionErrors,
  sessionHistory,
  sessionKnowledgeItems,
  sessionKnowledgePointOccurrences,
  sessionTranscripts,
} from "@english-coach/database/schema";
import { generateText, Output } from "ai";
import { Queue, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { producerRedis, workerRedis } from "../redis";
import {
  persistRewrittenTranscriptTurnsForSession,
  persistTranscriptAnnotationsForSession,
} from "./in-conversation.analysis";

type TranscriptTurns = typeof sessionTranscripts.$inferSelect.turns;

function normalizeTextForMatching(value: string) {
  return value.trim().toLowerCase();
}

function humanizeToken(value: string) {
  return value.replaceAll("_", " ");
}

function buildErrorFollowUpPrompt(suggestion: string) {
  const normalizedSuggestion = suggestion.trim().replace(/[.?!]+$/u, "");
  return `Ask the agent why ${normalizedSuggestion} fits better here.`;
}

function buildKnowledgeFollowUpPrompt(item: LingAnalysisResult["knowledgeItemsUsed"][number]) {
  const example = item.example.trim().replace(/[.?!]+$/u, "");
  return `Ask the agent how "${example}" helps ${humanizeToken(item.communicativeFunction)}.`;
}

function findMatchedTranscriptTurnIndex(turns: TranscriptTurns, utterance: string) {
  return turns.findIndex(
    (turn) => turn.speaker === "user" && (turn.text.includes(utterance) || utterance.includes(turn.text)),
  );
}

function buildPostSessionTranscriptAnnotations({
  analysis,
  occurrencePromptCandidates,
  sessionHistoryId,
  turns,
}: {
  analysis: LingAnalysisResult;
  occurrencePromptCandidates: Array<{
    item: LingAnalysisResult["knowledgeItemsUsed"][number];
    occurrences: ReturnType<typeof deriveKnowledgePointOccurrences>;
  }>;
  sessionHistoryId: string;
  turns: TranscriptTurns;
}) {
  const annotations: TranscriptAnnotation[] = [];

  for (const error of analysis.errors) {
    const transcriptTurnIndex = findMatchedTranscriptTurnIndex(turns, error.utterance);

    if (transcriptTurnIndex < 0) {
      continue;
    }

    annotations.push(
      transcriptAnnotationSchema.parse({
        coachingKind: "error_hint",
        id: `post-session:error:${sessionHistoryId}:${transcriptTurnIndex}:${normalizeTextForMatching(error.utterance)}`,
        kind: "coaching",
        source: "post-session-review",
        text: buildErrorFollowUpPrompt(error.suggestion),
        transcriptTurnIndex,
      }),
    );
  }

  for (const candidate of occurrencePromptCandidates) {
    const primaryOccurrence =
      candidate.occurrences.find((occurrence) => occurrence.speaker === "user") ?? candidate.occurrences[0];

    if (!primaryOccurrence) {
      continue;
    }

    annotations.push(
      transcriptAnnotationSchema.parse({
        coachingKind: "knowledge_hint",
        id: `post-session:knowledge:${sessionHistoryId}:${candidate.item.pattern}:${primaryOccurrence.transcriptTurnIndex}`,
        kind: "coaching",
        source: "post-session-review",
        text: buildKnowledgeFollowUpPrompt(candidate.item),
        transcriptTurnIndex: primaryOccurrence.transcriptTurnIndex,
      }),
    );
  }

  return annotations;
}

function deriveKnowledgePointOccurrences({
  item,
  knowledgeItemId,
  sessionHistoryId,
  turns,
}: {
  item: LingAnalysisResult["knowledgeItemsUsed"][number];
  knowledgeItemId: string;
  sessionHistoryId: string;
  turns: TranscriptTurns;
}) {
  const speakerTurns = turns
    .map((turn, transcriptTurnIndex) => ({ ...turn, transcriptTurnIndex }))
    .filter((turn) => turn.speaker === item.speaker);
  const assignmentCountsByTurn = new Map<number, number>();
  const groupedOccurrences = new Map<string, typeof sessionKnowledgePointOccurrences.$inferInsert>();

  for (const excerpt of item.usageExcerpts) {
    const normalizedExcerpt = normalizeTextForMatching(excerpt);

    if (!normalizedExcerpt) {
      continue;
    }

    const candidates = speakerTurns.filter((turn) => {
      const normalizedTurn = normalizeTextForMatching(turn.text);

      return normalizedTurn.includes(normalizedExcerpt) || normalizedExcerpt.includes(normalizedTurn);
    });
    const matchedTurn = candidates.sort((left, right) => {
      const leftAssignments = assignmentCountsByTurn.get(left.transcriptTurnIndex) ?? 0;
      const rightAssignments = assignmentCountsByTurn.get(right.transcriptTurnIndex) ?? 0;

      if (leftAssignments !== rightAssignments) {
        return leftAssignments - rightAssignments;
      }

      return left.transcriptTurnIndex - right.transcriptTurnIndex;
    })[0];

    if (!matchedTurn) {
      continue;
    }

    assignmentCountsByTurn.set(
      matchedTurn.transcriptTurnIndex,
      (assignmentCountsByTurn.get(matchedTurn.transcriptTurnIndex) ?? 0) + 1,
    );

    const occurrenceKey = [matchedTurn.transcriptTurnIndex, item.speaker, excerpt].join(":");
    const existingOccurrence = groupedOccurrences.get(occurrenceKey);

    if (existingOccurrence) {
      groupedOccurrences.set(occurrenceKey, {
        ...existingOccurrence,
        occurrenceCount: (existingOccurrence.occurrenceCount ?? 1) + 1,
      });
      continue;
    }

    groupedOccurrences.set(occurrenceKey, {
      excerpt,
      id: crypto.randomUUID(),
      knowledgeItemId,
      occurrenceCount: 1,
      sessionHistoryId,
      speaker: item.speaker,
      transcriptTurnIndex: matchedTurn.transcriptTurnIndex,
    });
  }

  return [...groupedOccurrences.values()];
}

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
      "Extract knowledge items from both user and agent turns. Use speaker='user' for active learner production and speaker='agent' for target language modelled by the coach.",
      "Only report genuine learner errors for user utterances.",
      JSON.stringify(turns),
    ].join("\n\n"),
  });

  return output;
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
    reviewStatus: "pending_review",
    reviewedAt: null,
    reviewedByUserId: null,
    source: "auto_generated",
    submissionId: null,
    syntaxRole: result.syntaxRole,
    updatedAt: now,
  });

  return knowledgeItemId;
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
  const occurrencePromptCandidates: Array<{
    item: LingAnalysisResult["knowledgeItemsUsed"][number];
    occurrences: ReturnType<typeof deriveKnowledgePointOccurrences>;
  }> = [];

  await db.transaction(async (transaction) => {
    await transaction.delete(sessionKnowledgeItems).where(eq(sessionKnowledgeItems.sessionHistoryId, sessionHistoryId));
    await transaction
      .delete(sessionKnowledgePointOccurrences)
      .where(eq(sessionKnowledgePointOccurrences.sessionHistoryId, sessionHistoryId));
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

      const occurrences = deriveKnowledgePointOccurrences({
        item,
        knowledgeItemId,
        sessionHistoryId,
        turns: transcriptRecord.turns,
      });

      occurrencePromptCandidates.push({ item, occurrences });

      if (occurrences.length > 0) {
        await transaction.insert(sessionKnowledgePointOccurrences).values(occurrences);
      }
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

  await persistRewrittenTranscriptTurnsForSession(sessionHistoryId, analysis.rewrittenUserTurns);
  await persistTranscriptAnnotationsForSession(
    sessionHistoryId,
    buildPostSessionTranscriptAnnotations({
      analysis,
      occurrencePromptCandidates,
      sessionHistoryId,
      turns: transcriptRecord.turns,
    }),
  );

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
