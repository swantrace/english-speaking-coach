import { openai } from "@ai-sdk/openai";
import {
  adminKnowledgeCreateSchema,
  type KnowledgeGenerateJobUpdate,
  type KnowledgeGenerateSubmissionItem,
  knowledgeGenerateProgressChannel as knowledgeGenerateDefaultProgressChannel,
  knowledgeGenerateJobUpdateSchema,
  knowledgeGenerateSubmissionKind,
  knowledgeGenerateUpdatedEvent,
  knowledgeGenerateJobName as sharedKnowledgeGenerateJobName,
  knowledgeGenerateQueueName as sharedKnowledgeGenerateQueueName,
} from "@english-coach/contract/knowledge";

export { knowledgeGenerateUpdatedEvent } from "@english-coach/contract/knowledge";

import { db, migrateDatabase, sqlite, submissionJobs, submissions } from "@english-coach/database";
import { knowledgeItems } from "@english-coach/database/schema";
import { generateText, Output } from "ai";
import { Queue, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { producerRedis, pubsubPublisherRedis, workerRedis } from "../redis";
import {
  createCompletedProgressMessage,
  createFailedProgressMessage,
  createQueuedProgressMessage,
  createStartedProgressMessage,
  type JobProgressMessage,
  publishJobProgress,
} from "./progress";

export const knowledgeGenerateProgressChannel =
  process.env.KNOWLEDGE_GENERATE_PROGRESS_CHANNEL ?? knowledgeGenerateDefaultProgressChannel;

export type KnowledgeGenerateJobData = KnowledgeGenerateSubmissionItem & {
  cursor: number;
  queuedAt: string;
  submissionId: string;
};

export type KnowledgeGenerateProgressMessage = KnowledgeGenerateJobUpdate;

export const knowledgeGenerateJobName = sharedKnowledgeGenerateJobName;
export const knowledgeGenerateQueueName = sharedKnowledgeGenerateQueueName;

export const knowledgeGenerateQueue = new Queue<KnowledgeGenerateJobData>(knowledgeGenerateQueueName, {
  connection: producerRedis,
});

const generatedKnowledgeItemSchema = adminKnowledgeCreateSchema
  .omit({
    isPendingReview: true,
  })
  .extend({
    example: z.string().trim().min(1).nullable().optional(),
  });

const modelGeneratedKnowledgeItemSchema = generatedKnowledgeItemSchema.extend({
  pattern: generatedKnowledgeItemSchema.shape.pattern.optional(),
});

type GeneratedKnowledgeItem = z.output<typeof generatedKnowledgeItemSchema>;
type ModelGeneratedKnowledgeItem = z.output<typeof modelGeneratedKnowledgeItemSchema>;

let knowledgeGeneratorOverride: ((prompt: string) => Promise<GeneratedKnowledgeItem>) | null = null;

export function publishKnowledgeGenerateProgress(message: KnowledgeGenerateProgressMessage) {
  return publishJobProgress(pubsubPublisherRedis, knowledgeGenerateProgressChannel, message);
}

function createKnowledgeGenerateProgressMessage(
  baseMessage: JobProgressMessage,
  jobData: Pick<KnowledgeGenerateJobData, "cursor" | "submissionId">,
) {
  return knowledgeGenerateJobUpdateSchema.parse({
    ...baseMessage,
    cursor: jobData.cursor,
    submissionId: jobData.submissionId,
  });
}

function createQueuedKnowledgeGenerateProgressMessage(jobId: string, jobData: KnowledgeGenerateJobData) {
  return createKnowledgeGenerateProgressMessage(
    createQueuedProgressMessage(jobId, jobData.queuedAt, "Knowledge item queued"),
    jobData,
  );
}

function createStartedKnowledgeGenerateProgressMessage(jobId: string, jobData: KnowledgeGenerateJobData) {
  return createKnowledgeGenerateProgressMessage(
    createStartedProgressMessage(jobId, jobData.queuedAt, "Knowledge item generation started"),
    jobData,
  );
}

function createCompletedKnowledgeGenerateProgressMessage(
  jobId: string,
  jobData: KnowledgeGenerateJobData,
  processedAt: string,
  pattern: string,
) {
  return createKnowledgeGenerateProgressMessage(
    createCompletedProgressMessage(jobId, `Knowledge item ready for review: ${pattern}`, processedAt),
    jobData,
  );
}

function createFailedKnowledgeGenerateProgressMessage(jobId: string, jobData: KnowledgeGenerateJobData, error: string) {
  return createKnowledgeGenerateProgressMessage(
    createFailedProgressMessage(jobId, error, "Knowledge item generation failed"),
    jobData,
  );
}

export async function createKnowledgeGenerateSubmission(
  submissionId: string,
  totalCount: number,
  userId?: string | null,
) {
  const now = new Date().toISOString();

  await db.insert(submissions).values({
    createdAt: now,
    id: submissionId,
    kind: knowledgeGenerateSubmissionKind,
    totalCount,
    updatedAt: now,
    userId: userId ?? null,
  });
}

async function saveKnowledgeGenerateSnapshot(message: KnowledgeGenerateProgressMessage) {
  const updatedAt = new Date().toISOString();

  await db
    .insert(submissionJobs)
    .values({
      kind: message.kind,
      cursor: message.cursor,
      error: message.error,
      jobId: message.jobId,
      message: message.message,
      processedAt: message.processedAt,
      progress: message.progress,
      queuedAt: message.queuedAt ?? new Date().toISOString(),
      status: message.status,
      submissionId: message.submissionId,
    })
    .onConflictDoUpdate({
      set: {
        error: message.error,
        message: message.message,
        processedAt: message.processedAt,
        progress: message.progress,
        queuedAt: message.queuedAt ?? new Date().toISOString(),
        status: message.status,
        submissionId: message.submissionId,
      },
      target: submissionJobs.jobId,
    });

  sqlite.query("update submissions set updated_at = ? where id = ?").run(updatedAt, message.submissionId);
}

export async function getKnowledgeGenerateSnapshots({
  cursor,
  limit,
  submissionId,
}: {
  cursor?: number;
  limit: number;
  submissionId: string;
}): Promise<KnowledgeGenerateProgressMessage[]> {
  const query =
    typeof cursor === "number"
      ? sqlite.query(
          [
            "select cursor, error, job_id, message, processed_at, progress, queued_at, status, submission_id",
            "from submission_jobs",
            "where submission_id = ? and cursor > ?",
            "order by cursor asc",
            "limit ?",
          ].join(" "),
        )
      : sqlite.query(
          [
            "select cursor, error, job_id, message, processed_at, progress, queued_at, status, submission_id",
            "from submission_jobs",
            "where submission_id = ?",
            "order by cursor asc",
            "limit ?",
          ].join(" "),
        );

  const snapshots = (
    typeof cursor === "number" ? query.all(submissionId, cursor, limit) : query.all(submissionId, limit)
  ) as Array<{
    cursor: number;
    error: string | null;
    job_id: string;
    message: string;
    processed_at: string | null;
    progress: number;
    queued_at: string;
    status: string;
    submission_id: string;
  }>;

  return snapshots.map((snapshot) =>
    knowledgeGenerateJobUpdateSchema.parse({
      cursor: snapshot.cursor,
      error: snapshot.error ?? undefined,
      jobId: snapshot.job_id,
      message: snapshot.message,
      processedAt: snapshot.processed_at ?? undefined,
      progress: snapshot.progress,
      queuedAt: snapshot.queued_at,
      status: snapshot.status,
      submissionId: snapshot.submission_id,
    }),
  );
}

function normalizePatternValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : undefined;
}

function derivePatternFallback(prompt: string, example?: string | null): string {
  const normalizedExample = normalizePatternValue(example?.replace(/^\s*(["'])/, "").replace(/(["'])\s*$/, ""));

  if (normalizedExample) {
    return normalizedExample;
  }

  return normalizePatternValue(prompt) ?? "General language pattern";
}

function coerceGeneratedKnowledgeItem(output: ModelGeneratedKnowledgeItem, prompt: string): GeneratedKnowledgeItem {
  return generatedKnowledgeItemSchema.parse({
    ...output,
    pattern: normalizePatternValue(output.pattern) ?? derivePatternFallback(prompt, output.example),
  });
}

async function generateKnowledgeItem(prompt: string): Promise<GeneratedKnowledgeItem> {
  if (knowledgeGeneratorOverride) {
    return knowledgeGeneratorOverride(prompt);
  }

  // if (process.env.KNOWLEDGE_GENERATE_USE_TEST_GENERATOR === "1" || process.env.NODE_ENV === "test") {
  //   return generatedKnowledgeItemSchema.parse({
  //     communicativeFunction: "give_or_seek_information",
  //     example: `Could you walk me through ${prompt}?`,
  //     fixednessLevel: "restricted_collocation",
  //     pattern: `Could you walk me through <np> ${prompt}`,
  //     syntaxRole: "clause_pattern",
  //   });
  // }

  const { output } = await generateText({
    model: openai(process.env.KNOWLEDGE_GENERATE_MODEL ?? "gpt-4.1-mini"),
    output: Output.object({
      schema: modelGeneratedKnowledgeItemSchema,
    }),
    prompt: [
      "You generate one structured English knowledge item for an admin review queue.",
      "Always include a non-empty 'pattern' field.",
      "Return a useful phrase pattern, optional example sentence, and linguistic classifications when confident.",
      "Keep the pattern concise and reusable for coaching.",
      prompt,
    ].join("\n\n"),
    providerOptions: {
      openai: {
        strictJsonSchema: false,
      },
    },
  });

  return coerceGeneratedKnowledgeItem(output, prompt);
}

async function persistKnowledgeItem(generatedKnowledgeItem: GeneratedKnowledgeItem) {
  const now = new Date().toISOString();
  const [existing] = await db
    .select()
    .from(knowledgeItems)
    .where(eq(knowledgeItems.pattern, generatedKnowledgeItem.pattern))
    .limit(1);

  if (existing) {
    if (existing.isPendingReview) {
      await db
        .update(knowledgeItems)
        .set({
          communicativeFunction: generatedKnowledgeItem.communicativeFunction ?? null,
          fixednessLevel: generatedKnowledgeItem.fixednessLevel ?? null,
          syntaxRole: generatedKnowledgeItem.syntaxRole ?? null,
          updatedAt: now,
        })
        .where(eq(knowledgeItems.id, existing.id));
    }

    return {
      knowledgeItemId: existing.id,
      pattern: generatedKnowledgeItem.pattern,
      processedAt: now,
    };
  }

  const knowledgeItemId = crypto.randomUUID();

  await db.insert(knowledgeItems).values({
    communicativeFunction: generatedKnowledgeItem.communicativeFunction ?? null,
    createdAt: now,
    fixednessLevel: generatedKnowledgeItem.fixednessLevel ?? null,
    id: knowledgeItemId,
    isPendingReview: true,
    pattern: generatedKnowledgeItem.pattern,
    senses: [],
    syntaxRole: generatedKnowledgeItem.syntaxRole ?? null,
    updatedAt: now,
  });

  return {
    knowledgeItemId,
    pattern: generatedKnowledgeItem.pattern,
    processedAt: now,
  };
}

export function setKnowledgeGeneratorForTests(generator: ((prompt: string) => Promise<GeneratedKnowledgeItem>) | null) {
  knowledgeGeneratorOverride = generator;
}

migrateDatabase();

export async function processKnowledgeGenerateJob(jobData: KnowledgeGenerateJobData, jobId: string) {
  const startedMessage = createStartedKnowledgeGenerateProgressMessage(jobId, jobData);

  await saveKnowledgeGenerateSnapshot(startedMessage);
  await publishKnowledgeGenerateProgress(startedMessage);

  const generatedKnowledgeItem = await generateKnowledgeItem(jobData.message);
  const persistedKnowledgeItem = await persistKnowledgeItem(generatedKnowledgeItem);

  const completedMessage = createCompletedKnowledgeGenerateProgressMessage(
    jobId,
    jobData,
    persistedKnowledgeItem.processedAt,
    persistedKnowledgeItem.pattern,
  );

  await saveKnowledgeGenerateSnapshot(completedMessage);
  await publishKnowledgeGenerateProgress(completedMessage);

  return persistedKnowledgeItem;
}

export const knowledgeGenerateWorker = new Worker<KnowledgeGenerateJobData>(
  knowledgeGenerateQueueName,
  async (job) => processKnowledgeGenerateJob(job.data, String(job.id)),
  {
    connection: workerRedis,
  },
);

knowledgeGenerateWorker.on("completed", (job) => {
  console.log(`knowledge.generate job ${job.id} completed`);
});

knowledgeGenerateWorker.on("failed", async (job, error) => {
  if (job) {
    const failedMessage = createFailedKnowledgeGenerateProgressMessage(String(job.id), job.data, error.message);

    await saveKnowledgeGenerateSnapshot(failedMessage);
    await publishKnowledgeGenerateProgress(failedMessage);
  }

  console.error(`knowledge.generate job ${job?.id ?? "unknown"} failed`, error);
});

export async function persistQueuedKnowledgeGenerateJob(jobId: string, jobData: KnowledgeGenerateJobData) {
  const queuedMessage = createQueuedKnowledgeGenerateProgressMessage(jobId, jobData);

  await saveKnowledgeGenerateSnapshot(queuedMessage);
  await publishKnowledgeGenerateProgress(queuedMessage);

  return queuedMessage;
}
