import {
  type KnowledgeOccurrenceEnrichJob,
  knowledgeOccurrenceEnrichJobName,
  knowledgeOccurrenceEnrichJobSchema,
  knowledgeOccurrenceEnrichQueueName,
} from "@english-coach/contract/knowledge";
import { db } from "@english-coach/database";
import { sessionKnowledgePointOccurrences } from "@english-coach/database/schema";
import { type Job, Queue, Worker } from "bullmq";
import { and, eq, isNull } from "drizzle-orm";
import { type GeneratedKnowledgeItem, getProvider, resolveKnowledgeGenerationModelRoute } from "../ai";
import { producerRedis, workerRedis } from "../redis";
import { getSessionProcessing, transitionSessionProcessingStage } from "../session-processing";
import { findKnowledgeOccurrenceEnrichmentBackfillIds } from "./helpers/knowledge-occurrence.backfill";
import {
  buildKnowledgeOccurrenceDraftUpdate,
  createKnowledgeOccurrenceEnrichmentJobs,
} from "./helpers/knowledge-occurrence.enrichment";
import { logWorkerCompleted, logWorkerFailed } from "./helpers/worker-logging";

export { buildKnowledgeOccurrenceDraftUpdate, createKnowledgeOccurrenceEnrichmentJobs };

export const knowledgeOccurrenceEnrichQueue = new Queue<KnowledgeOccurrenceEnrichJob>(
  knowledgeOccurrenceEnrichQueueName,
  { connection: producerRedis },
);

const knowledgeModelRoute = resolveKnowledgeGenerationModelRoute();
const knowledgeItemAi = getProvider(knowledgeModelRoute.providerId).knowledgeItem;

let knowledgeOccurrenceEnrichGeneratorOverride:
  | (({
      proposedPattern,
      utterance,
    }: {
      proposedPattern: string;
      utterance: string;
    }) => Promise<GeneratedKnowledgeItem>)
  | null = null;

async function generateKnowledgeItemFromOccurrence({
  proposedPattern,
  sessionHistoryId,
  utterance,
}: {
  proposedPattern: string;
  sessionHistoryId?: string | null;
  utterance: string;
}) {
  if (knowledgeOccurrenceEnrichGeneratorOverride) {
    return knowledgeOccurrenceEnrichGeneratorOverride({ proposedPattern, utterance });
  }

  return knowledgeItemAi.generateKnowledgeItemFromOccurrence(
    knowledgeModelRoute.modelId,
    { proposedPattern, utterance },
    { sessionHistoryId },
  );
}

export async function enqueueKnowledgeOccurrenceEnrichment(occurrenceIds: string[]) {
  const jobs = createKnowledgeOccurrenceEnrichmentJobs(occurrenceIds);

  if (jobs.length > 0) {
    await knowledgeOccurrenceEnrichQueue.addBulk(jobs);
  }
}

/**
 * Enqueue candidate enrichment for occurrences created before draft fields were
 * introduced. Deterministic BullMQ job IDs make this safe on every worker boot.
 * This function never approves an occurrence or writes a knowledge item.
 */
export async function backfillKnowledgeOccurrenceEnrichment() {
  const occurrenceIds = await findKnowledgeOccurrenceEnrichmentBackfillIds();
  await enqueueKnowledgeOccurrenceEnrichment(occurrenceIds);

  return { enqueuedCount: occurrenceIds.length };
}

export async function processKnowledgeOccurrenceEnrichJob(occurrenceId: string) {
  const [occurrence] = await db
    .select()
    .from(sessionKnowledgePointOccurrences)
    .where(
      and(
        eq(sessionKnowledgePointOccurrences.id, occurrenceId),
        isNull(sessionKnowledgePointOccurrences.knowledgeItemId),
        eq(sessionKnowledgePointOccurrences.status, "proposed"),
      ),
    )
    .limit(1);

  if (!occurrence || (occurrence.proposedPatternType && occurrence.proposedSenses?.length)) {
    return { occurrenceId, sessionHistoryId: occurrence?.sessionHistoryId ?? null, status: "skipped" as const };
  }

  const generatedKnowledgeItem = await generateKnowledgeItemFromOccurrence({
    proposedPattern: occurrence.proposedPattern,
    sessionHistoryId: occurrence.sessionHistoryId,
    utterance: occurrence.utterance,
  });
  const draft = buildKnowledgeOccurrenceDraftUpdate(generatedKnowledgeItem);
  const updatedOccurrences = await db
    .update(sessionKnowledgePointOccurrences)
    .set(draft)
    .where(
      and(
        eq(sessionKnowledgePointOccurrences.id, occurrence.id),
        isNull(sessionKnowledgePointOccurrences.knowledgeItemId),
        eq(sessionKnowledgePointOccurrences.status, "proposed"),
      ),
    )
    .returning({ id: sessionKnowledgePointOccurrences.id });

  return {
    occurrenceId: occurrence.id,
    sessionHistoryId: occurrence.sessionHistoryId,
    status: updatedOccurrences.length > 0 ? ("enriched" as const) : ("skipped" as const),
  };
}

async function markKnowledgeProcessingReadyIfComplete(sessionHistoryId: string | null) {
  if (!sessionHistoryId) {
    return;
  }

  const processing = await getSessionProcessing(sessionHistoryId);

  if (!processing || processing.knowledgeStatus !== "processing") {
    return;
  }

  const [pendingOccurrence] = await db
    .select({ id: sessionKnowledgePointOccurrences.id })
    .from(sessionKnowledgePointOccurrences)
    .where(
      and(
        eq(sessionKnowledgePointOccurrences.sessionHistoryId, sessionHistoryId),
        eq(sessionKnowledgePointOccurrences.status, "proposed"),
        isNull(sessionKnowledgePointOccurrences.knowledgeItemId),
        isNull(sessionKnowledgePointOccurrences.proposedSenses),
      ),
    )
    .limit(1);

  if (!pendingOccurrence) {
    await transitionSessionProcessingStage({ sessionHistoryId, stage: "knowledge", status: "ready" });
  }
}

async function markKnowledgeProcessingFailed(occurrenceId: string, error: unknown) {
  const [occurrence] = await db
    .select({ sessionHistoryId: sessionKnowledgePointOccurrences.sessionHistoryId })
    .from(sessionKnowledgePointOccurrences)
    .where(eq(sessionKnowledgePointOccurrences.id, occurrenceId))
    .limit(1);

  if (!occurrence) {
    return;
  }

  const processing = await getSessionProcessing(occurrence.sessionHistoryId);

  if (!processing || !["queued", "processing"].includes(processing.knowledgeStatus)) {
    return;
  }

  await transitionSessionProcessingStage({
    error,
    sessionHistoryId: occurrence.sessionHistoryId,
    stage: "knowledge",
    status: "failed",
  });
}

async function handleKnowledgeOccurrenceEnrichJob(job: Job<KnowledgeOccurrenceEnrichJob>) {
  const { occurrenceId } = knowledgeOccurrenceEnrichJobSchema.parse(job.data);

  try {
    const result = await processKnowledgeOccurrenceEnrichJob(occurrenceId);
    await markKnowledgeProcessingReadyIfComplete(result.sessionHistoryId);
    return result;
  } catch (error) {
    const maxAttempts = job.opts.attempts ?? 1;

    if (job.attemptsMade + 1 >= maxAttempts) {
      await markKnowledgeProcessingFailed(occurrenceId, error);
    }

    throw error;
  }
}

export const knowledgeOccurrenceEnrichWorker = new Worker<KnowledgeOccurrenceEnrichJob>(
  knowledgeOccurrenceEnrichQueueName,
  handleKnowledgeOccurrenceEnrichJob,
  { connection: workerRedis },
);

knowledgeOccurrenceEnrichWorker.on("completed", (job) => {
  logWorkerCompleted(knowledgeOccurrenceEnrichJobName, job);
});

knowledgeOccurrenceEnrichWorker.on("failed", (job, error) => {
  logWorkerFailed(knowledgeOccurrenceEnrichJobName, job, error);
});

export function setKnowledgeOccurrenceEnrichGeneratorForTests(
  generator:
    | (({
        proposedPattern,
        utterance,
      }: {
        proposedPattern: string;
        utterance: string;
      }) => Promise<GeneratedKnowledgeItem>)
    | null,
) {
  knowledgeOccurrenceEnrichGeneratorOverride = generator;
}
