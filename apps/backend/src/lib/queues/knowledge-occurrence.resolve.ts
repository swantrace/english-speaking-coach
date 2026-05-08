import {
  type KnowledgeOccurrenceResolveJob,
  knowledgeOccurrenceResolveJobName,
  knowledgeOccurrenceResolveJobSchema,
  knowledgeOccurrenceResolveQueueName,
} from "@english-coach/contract/knowledge";
import { db } from "@english-coach/database";
import { sessionKnowledgePointOccurrences } from "@english-coach/database/schema";
import { type Job, Queue, Worker } from "bullmq";
import { and, eq, isNull } from "drizzle-orm";
import { type GeneratedKnowledgeItem, getProvider, modelConfig } from "../ai";
import { defaultProviderId } from "../env";
import { producerRedis, workerRedis } from "../redis";
import { persistGeneratedKnowledgeItem } from "./helpers/knowledge-items.persistence";
import { logWorkerCompleted, logWorkerFailed } from "./helpers/worker-logging";

export const knowledgeOccurrenceResolveQueue = new Queue<KnowledgeOccurrenceResolveJob>(
  knowledgeOccurrenceResolveQueueName,
  { connection: producerRedis },
);

const knowledgeItemAi = getProvider(defaultProviderId).knowledgeItem;
const models = modelConfig[defaultProviderId];

let knowledgeOccurrenceResolveGeneratorOverride:
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
  if (knowledgeOccurrenceResolveGeneratorOverride) {
    return knowledgeOccurrenceResolveGeneratorOverride({ proposedPattern, utterance });
  }

  return knowledgeItemAi.generateKnowledgeItemFromOccurrence(
    models.KNOWLEDGE_GENERATE_MODEL,
    {
      proposedPattern,
      utterance,
    },
    {
      sessionHistoryId,
    },
  );
}

export async function processKnowledgeOccurrenceResolveJob(occurrenceId: string) {
  const [occurrence] = await db
    .select()
    .from(sessionKnowledgePointOccurrences)
    .where(
      and(
        eq(sessionKnowledgePointOccurrences.id, occurrenceId),
        isNull(sessionKnowledgePointOccurrences.knowledgeItemId),
      ),
    )
    .limit(1);

  if (!occurrence) {
    return { occurrenceId, status: "skipped" as const };
  }

  const generatedKnowledgeItem = await generateKnowledgeItemFromOccurrence({
    proposedPattern: occurrence.proposedPattern,
    sessionHistoryId: occurrence.sessionHistoryId,
    utterance: occurrence.utterance,
  });
  const { knowledgeItemId } = await persistGeneratedKnowledgeItem(generatedKnowledgeItem);

  await db
    .update(sessionKnowledgePointOccurrences)
    .set({ knowledgeItemId })
    .where(eq(sessionKnowledgePointOccurrences.id, occurrence.id));
  return { knowledgeItemId, occurrenceId: occurrence.id, status: "resolved" as const };
}

async function handleKnowledgeOccurrenceResolveJob(job: Job<KnowledgeOccurrenceResolveJob>) {
  const { occurrenceId } = knowledgeOccurrenceResolveJobSchema.parse(job.data);
  return processKnowledgeOccurrenceResolveJob(occurrenceId);
}

export const knowledgeOccurrenceResolveWorker = new Worker<KnowledgeOccurrenceResolveJob>(
  knowledgeOccurrenceResolveQueueName,
  handleKnowledgeOccurrenceResolveJob,
  { connection: workerRedis },
);

knowledgeOccurrenceResolveWorker.on("completed", (job) => {
  logWorkerCompleted(knowledgeOccurrenceResolveJobName, job);
});

knowledgeOccurrenceResolveWorker.on("failed", (job, error) => {
  logWorkerFailed(knowledgeOccurrenceResolveJobName, job, error);
});

export function setKnowledgeOccurrenceResolveGeneratorForTests(
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
  knowledgeOccurrenceResolveGeneratorOverride = generator;
}
