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
    return { occurrenceId, status: "skipped" as const };
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
    status: updatedOccurrences.length > 0 ? ("enriched" as const) : ("skipped" as const),
  };
}

async function handleKnowledgeOccurrenceEnrichJob(job: Job<KnowledgeOccurrenceEnrichJob>) {
  const { occurrenceId } = knowledgeOccurrenceEnrichJobSchema.parse(job.data);
  return processKnowledgeOccurrenceEnrichJob(occurrenceId);
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
