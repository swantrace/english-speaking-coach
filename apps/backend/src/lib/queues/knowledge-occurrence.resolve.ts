import { db } from "@english-coach/database";
import { knowledgeItems, sessionKnowledgePointOccurrences } from "@english-coach/database/schema";
import { Queue, Worker } from "bullmq";
import { and, eq, isNull } from "drizzle-orm";
import { type GeneratedKnowledgeItem, getProvider, modelConfig } from "../ai";
import { defaultProviderId } from "../env";
import { producerRedis, workerRedis } from "../redis";

export const knowledgeOccurrenceResolveQueueName = "knowledgeOccurrenceResolve";
export const knowledgeOccurrenceResolveJobName = "knowledgeOccurrenceResolve";

export const knowledgeOccurrenceResolveQueue = new Queue<{ occurrenceId: string }>(
  knowledgeOccurrenceResolveQueueName,
  {
    connection: producerRedis,
  },
);

const knowledgeItemAi = getProvider(defaultProviderId).knowledgeItem;
const models = modelConfig[defaultProviderId];

async function generateKnowledgeItemFromOccurrence({
  proposedPattern,
  utterance,
}: {
  proposedPattern: string;
  utterance: string;
}): Promise<GeneratedKnowledgeItem> {
  return knowledgeItemAi.generateKnowledgeItemFromOccurrence(models.KNOWLEDGE_GENERATE_MODEL, {
    proposedPattern,
    utterance,
  });
}

async function resolveKnowledgeItemId(generated: GeneratedKnowledgeItem) {
  const now = new Date().toISOString();
  const [existing] = await db
    .select()
    .from(knowledgeItems)
    .where(eq(knowledgeItems.pattern, generated.pattern))
    .limit(1);

  if (existing) {
    return existing.id;
  }

  const knowledgeItemId = crypto.randomUUID();

  await db.insert(knowledgeItems).values({
    communicativeFunction: generated.communicativeFunction ?? null,
    createdAt: now,
    fixednessLevel: generated.fixednessLevel ?? null,
    id: knowledgeItemId,
    isPendingReview: true,
    pattern: generated.pattern,
    senses: [],
    syntaxRole: generated.syntaxRole ?? null,
    updatedAt: now,
  });

  return knowledgeItemId;
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
    utterance: occurrence.utterance,
  });
  const knowledgeItemId = await resolveKnowledgeItemId(generatedKnowledgeItem);

  await db
    .update(sessionKnowledgePointOccurrences)
    .set({ knowledgeItemId })
    .where(eq(sessionKnowledgePointOccurrences.id, occurrence.id));

  return { knowledgeItemId, occurrenceId: occurrence.id, status: "resolved" as const };
}

export const knowledgeOccurrenceResolveWorker = new Worker<{ occurrenceId: string }>(
  knowledgeOccurrenceResolveQueueName,
  async (job) => processKnowledgeOccurrenceResolveJob(job.data.occurrenceId),
  {
    connection: workerRedis,
  },
);

knowledgeOccurrenceResolveWorker.on("completed", (job) => {
  console.log(`${knowledgeOccurrenceResolveJobName} job ${job.id} completed`);
});

knowledgeOccurrenceResolveWorker.on("failed", (job, error) => {
  console.error(`${knowledgeOccurrenceResolveJobName} job ${job?.id ?? "unknown"} failed`, error);
});
