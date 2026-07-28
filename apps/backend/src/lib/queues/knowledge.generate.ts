import {
  type KnowledgeGenerateJobUpdate,
  type KnowledgeGenerateSubmissionItem,
  knowledgeGenerateProgressChannel as knowledgeGenerateDefaultProgressChannel,
  knowledgeGenerateJobName,
  knowledgeGenerateJobUpdateSchema,
  knowledgeGenerateQueueName,
  knowledgeGenerateSubmissionKind,
} from "@english-coach/contract/knowledge";

import { type Job, Queue, Worker } from "bullmq";
import { type GeneratedKnowledgeItem, getProvider, resolveKnowledgeGenerationModelRoute } from "../ai";
import { producerRedis, pubsubPublisherRedis, workerRedis } from "../redis";
import { persistGeneratedKnowledgeItem } from "./helpers/knowledge-items.persistence";
import { type JobProgressBaseMessage, publishJobProgress } from "./helpers/progress";
import {
  createSubmissionProgressMessage,
  createSubmissionRecord,
  getSubmissionProgressSnapshots,
  type SubmissionProgressMessage,
  saveSubmissionProgressSnapshot,
} from "./helpers/submission-progress";
import { logWorkerCompleted, logWorkerFailed } from "./helpers/worker-logging";

export const knowledgeGenerateProgressChannel =
  process.env.KNOWLEDGE_GENERATE_PROGRESS_CHANNEL ?? knowledgeGenerateDefaultProgressChannel;

export type KnowledgeGenerateJobData = KnowledgeGenerateSubmissionItem & {
  cursor: number;
  queuedAt: string;
  submissionId: string;
};

export type KnowledgeGenerateProgressMessage = KnowledgeGenerateJobUpdate;

export const knowledgeGenerateQueue = new Queue<KnowledgeGenerateJobData>(knowledgeGenerateQueueName, {
  connection: producerRedis,
});

const knowledgeModelRoute = resolveKnowledgeGenerationModelRoute();
const knowledgeItemAi = getProvider(knowledgeModelRoute.providerId).knowledgeItem;

let knowledgeGeneratorOverride: ((prompt: string) => Promise<GeneratedKnowledgeItem>) | null = null;

export function publishKnowledgeGenerateProgress(message: KnowledgeGenerateProgressMessage) {
  return publishJobProgress(pubsubPublisherRedis, knowledgeGenerateProgressChannel, message);
}

function createKnowledgeGenerateProgressMessage(
  jobId: string,
  jobData: Pick<KnowledgeGenerateJobData, "cursor" | "submissionId">,
  progress: Omit<JobProgressBaseMessage, "jobId">,
) {
  return createSubmissionProgressMessage({
    jobData,
    kind: knowledgeGenerateSubmissionKind,
    progress: {
      jobId,
      ...progress,
    },
    schema: knowledgeGenerateJobUpdateSchema,
  });
}

export async function createKnowledgeGenerateSubmission(
  submissionId: string,
  totalCount: number,
  userId?: string | null,
) {
  await createSubmissionRecord({
    kind: knowledgeGenerateSubmissionKind,
    totalCount,
    submissionId,
    userId,
  });
}

async function saveKnowledgeGenerateSnapshot(message: KnowledgeGenerateProgressMessage) {
  await saveSubmissionProgressSnapshot(message as SubmissionProgressMessage);
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
  return getSubmissionProgressSnapshots({
    cursor,
    limit,
    schema: knowledgeGenerateJobUpdateSchema,
    submissionId,
  });
}

async function generateKnowledgeItem(
  prompt: string,
  job: Job<KnowledgeGenerateJobData>,
): Promise<GeneratedKnowledgeItem> {
  if (knowledgeGeneratorOverride) {
    return knowledgeGeneratorOverride(prompt);
  }

  return knowledgeItemAi.generateKnowledgeItem(
    knowledgeModelRoute.modelId,
    {
      input: prompt,
    },
    {
      metadata: {
        cursor: job.data.cursor,
        queuedAt: job.data.queuedAt,
      },
      submissionId: job.data.submissionId,
      submissionJobId: String(job.id),
    },
  );
}

export function setKnowledgeGeneratorForTests(generator: ((prompt: string) => Promise<GeneratedKnowledgeItem>) | null) {
  knowledgeGeneratorOverride = generator;
}

async function handleKnowledgeGenerateJob(job: Job<KnowledgeGenerateJobData>) {
  // Step 1: publish started job progress
  const startedMessage = createKnowledgeGenerateProgressMessage(String(job.id), job.data, {
    message: "Knowledge item generation started",
    progress: 10,
    queuedAt: job.data.queuedAt,
    status: "started",
  });
  await saveKnowledgeGenerateSnapshot({
    ...startedMessage,
    input: { message: job.data.message },
  } as SubmissionProgressMessage);
  await publishKnowledgeGenerateProgress(startedMessage);

  // Step 2: generate the knowledge item
  const generatedKnowledgeItem = await generateKnowledgeItem(job.data.message, job);
  const generatedMessage = createKnowledgeGenerateProgressMessage(String(job.id), job.data, {
    message: "Knowledge item generated; saving for review",
    progress: 75,
    status: "started",
  });

  await saveKnowledgeGenerateSnapshot({
    ...generatedMessage,
    input: { message: job.data.message },
    output: generatedKnowledgeItem,
  } as SubmissionProgressMessage);
  await publishKnowledgeGenerateProgress(generatedMessage);

  const persistedKnowledgeItem = await persistGeneratedKnowledgeItem(generatedKnowledgeItem);

  // Step 3: publish completion progress
  const completedMessage = createKnowledgeGenerateProgressMessage(String(job.id), job.data, {
    message: `Knowledge item ready for review: ${persistedKnowledgeItem.pattern}`,
    processedAt: persistedKnowledgeItem.processedAt,
    progress: 100,
    status: "completed",
  });
  const completedSnapshot = {
    ...completedMessage,
    input: { message: job.data.message },
    knowledgeItemId: persistedKnowledgeItem.knowledgeItemId,
    output: generatedKnowledgeItem,
  } as SubmissionProgressMessage;

  await saveKnowledgeGenerateSnapshot(completedSnapshot);
  await publishKnowledgeGenerateProgress(completedSnapshot as KnowledgeGenerateProgressMessage);

  return persistedKnowledgeItem;
}

export const knowledgeGenerateWorker = new Worker<KnowledgeGenerateJobData>(
  knowledgeGenerateQueueName,
  handleKnowledgeGenerateJob,
  {
    connection: workerRedis,
  },
);

knowledgeGenerateWorker.on("completed", (job) => {
  logWorkerCompleted(knowledgeGenerateJobName, job);
});

knowledgeGenerateWorker.on("failed", async (job, error) => {
  if (job) {
    const failedMessage = createKnowledgeGenerateProgressMessage(String(job.id), job.data, {
      error: error.message,
      message: "Knowledge item generation failed",
      progress: 100,
      status: "failed",
    });
    const failedSnapshot = {
      ...failedMessage,
      input: { message: job.data.message },
    } as SubmissionProgressMessage;

    await saveKnowledgeGenerateSnapshot(failedSnapshot);
    await publishKnowledgeGenerateProgress(failedSnapshot as KnowledgeGenerateProgressMessage);
  }

  logWorkerFailed(knowledgeGenerateJobName, job, error);
});

export async function persistQueuedKnowledgeGenerateJob(jobId: string, jobData: KnowledgeGenerateJobData) {
  const queuedMessage = createKnowledgeGenerateProgressMessage(jobId, jobData, {
    message: "Knowledge item queued",
    progress: 0,
    queuedAt: jobData.queuedAt,
    status: "queued",
  });

  await saveKnowledgeGenerateSnapshot({
    ...queuedMessage,
    input: { message: jobData.message },
  } as SubmissionProgressMessage);
  await publishKnowledgeGenerateProgress(queuedMessage);

  return queuedMessage;
}
