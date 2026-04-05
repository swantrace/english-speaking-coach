import { openai } from "@ai-sdk/openai";
import {
  scenarioCharacterSchema,
  scenarioReviewStatusSchema,
  scenarioSchema,
  scenarioSourceSchema,
} from "@english-coach/contract";
import type {
  ScenarioGenerateJobUpdate,
  ScenarioGenerateSubmissionItem,
} from "@english-coach/contract/scenario-generate";
import {
  scenarioGenerateProgressChannel as scenarioGenerateDefaultProgressChannel,
  scenarioGenerateJobUpdateSchema,
  scenarioGenerateSubmissionKind,
  scenarioGenerateJobName as sharedScenarioGenerateJobName,
  scenarioGenerateQueueName as sharedScenarioGenerateQueueName,
} from "@english-coach/contract/scenario-generate";

export { scenarioGenerateUpdatedEvent } from "@english-coach/contract/scenario-generate";

import { db, migrateDatabase, sqlite, submissionJobs, submissions } from "@english-coach/database";
import { scenarios } from "@english-coach/database/schema";
import { generateObject } from "ai";
import { Queue, Worker } from "bullmq";
import { producerRedis, pubsubPublisherRedis, workerRedis } from "../redis";
import {
  createCompletedProgressMessage,
  createFailedProgressMessage,
  createQueuedProgressMessage,
  createStartedProgressMessage,
  type JobProgressMessage,
  publishJobProgress,
} from "./progress";

export const scenarioGenerateProgressChannel =
  process.env.SCENARIO_GENERATE_PROGRESS_CHANNEL ?? scenarioGenerateDefaultProgressChannel;

export type ScenarioGenerateJobData = ScenarioGenerateSubmissionItem & {
  cursor: number;
  queuedAt: string;
  submissionId: string;
};

export type ScenarioGenerateProgressMessage = ScenarioGenerateJobUpdate;

export const scenarioGenerateJobName = sharedScenarioGenerateJobName;
export const scenarioGenerateQueueName = sharedScenarioGenerateQueueName;

export const scenarioGenerateQueue = new Queue<ScenarioGenerateJobData>(scenarioGenerateQueueName, {
  connection: producerRedis,
});

const generatedScenarioSchema = scenarioSchema
  .omit({
    createdAt: true,
    id: true,
    reviewStatus: true,
    reviewedAt: true,
    reviewedByUserId: true,
    source: true,
    submissionId: true,
    updatedAt: true,
  })
  .extend({
    // OpenAI structured outputs reject tuple-style array schemas, so use a fixed-length
    // array here and normalize back to the persisted tuple shape after generation.
    characters: scenarioCharacterSchema.array().length(2),
  });

type GeneratedScenario = typeof generatedScenarioSchema._output;

let scenarioGeneratorOverride: ((prompt: string) => Promise<GeneratedScenario>) | null = null;

export function publishScenarioGenerateProgress(message: ScenarioGenerateProgressMessage) {
  return publishJobProgress(pubsubPublisherRedis, scenarioGenerateProgressChannel, message);
}

function createScenarioGenerateProgressMessage(
  baseMessage: JobProgressMessage,
  jobData: Pick<ScenarioGenerateJobData, "cursor" | "submissionId">,
) {
  return scenarioGenerateJobUpdateSchema.parse({
    ...baseMessage,
    cursor: jobData.cursor,
    submissionId: jobData.submissionId,
  });
}

function createQueuedScenarioGenerateProgressMessage(jobId: string, jobData: ScenarioGenerateJobData) {
  return createScenarioGenerateProgressMessage(
    createQueuedProgressMessage(jobId, jobData.queuedAt, "Scenario queued"),
    jobData,
  );
}

function createStartedScenarioGenerateProgressMessage(jobId: string, jobData: ScenarioGenerateJobData) {
  return createScenarioGenerateProgressMessage(
    createStartedProgressMessage(jobId, jobData.queuedAt, "Scenario generation started"),
    jobData,
  );
}

function createCompletedScenarioGenerateProgressMessage(
  jobId: string,
  jobData: ScenarioGenerateJobData,
  processedAt: string,
  scenarioTitle: string,
) {
  return createScenarioGenerateProgressMessage(
    createCompletedProgressMessage(jobId, `Scenario ready for review: ${scenarioTitle}`, processedAt),
    jobData,
  );
}

function createFailedScenarioGenerateProgressMessage(jobId: string, jobData: ScenarioGenerateJobData, error: string) {
  return createScenarioGenerateProgressMessage(
    createFailedProgressMessage(jobId, error, "Scenario generation failed"),
    jobData,
  );
}

export async function createScenarioGenerateSubmission(
  submissionId: string,
  totalCount: number,
  userId?: string | null,
) {
  const now = new Date().toISOString();

  await db.insert(submissions).values({
    createdAt: now,
    id: submissionId,
    kind: scenarioGenerateSubmissionKind,
    totalCount,
    updatedAt: now,
    userId: userId ?? null,
  });
}

async function saveScenarioGenerateSnapshot(message: ScenarioGenerateProgressMessage) {
  const updatedAt = new Date().toISOString();

  await db
    .insert(submissionJobs)
    .values({
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

export async function getScenarioGenerateSnapshots({
  cursor,
  limit,
  submissionId,
}: {
  cursor?: number;
  limit: number;
  submissionId: string;
}): Promise<ScenarioGenerateProgressMessage[]> {
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
    scenarioGenerateJobUpdateSchema.parse({
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

async function generateScenario(prompt: string): Promise<GeneratedScenario> {
  if (scenarioGeneratorOverride) {
    return scenarioGeneratorOverride(prompt);
  }

  if (process.env.SCENARIO_GENERATE_USE_TEST_GENERATOR === "1") {
    return generatedScenarioSchema.parse({
      characters: [
        { description: "Practising customer language in a deterministic test scenario.", name: "Learner" },
        { description: "Responds naturally and keeps the test queue deterministic.", name: "Coach" },
      ],
      exampleDialogue: [
        { speaker: "agent", text: "Hello. What would you like to practise today?" },
        { speaker: "user", text: `I want to practise: ${prompt}` },
      ],
      goals: {
        goals: [
          {
            description: "State the main request clearly",
            id: "state-main-request",
            logic: { required_intents: ["state_request"], required_slots: ["request_detail"] },
          },
        ],
        intents: ["state_request"],
        slots: ["request_detail"],
      },
      setting: `Deterministic test scenario for ${prompt}`,
      title: `Generated from ${prompt}`,
    });
  }

  const { object } = await generateObject({
    model: openai(process.env.SCENARIO_GENERATE_MODEL ?? "gpt-4.1-mini"),
    prompt: [
      "You generate structured role-play scenarios for an English-speaking coach platform.",
      "Return one scenario with exactly two characters, realistic goals, and a short example dialogue.",
      "The scenario should be practical for spoken English practice and should reflect this brief:",
      prompt,
    ].join("\n\n"),
    providerOptions: {
      openai: {
        strictJsonSchema: false,
      },
    },
    schema: generatedScenarioSchema,
  });

  return object;
}

async function persistScenario(
  generatedScenario: GeneratedScenario,
  jobData: Pick<ScenarioGenerateJobData, "submissionId">,
) {
  const now = new Date().toISOString();
  const scenarioId = crypto.randomUUID();

  if (generatedScenario.characters.length !== 2) {
    throw new Error("Generated scenario must contain exactly two characters");
  }

  await db.insert(scenarios).values({
    characters: [generatedScenario.characters[0], generatedScenario.characters[1]],
    createdAt: now,
    exampleDialogue: generatedScenario.exampleDialogue,
    goals: generatedScenario.goals,
    id: scenarioId,
    reviewStatus: scenarioReviewStatusSchema.enum.pending_review,
    reviewedAt: null,
    reviewedByUserId: null,
    setting: generatedScenario.setting,
    source: scenarioSourceSchema.enum.auto_generated,
    submissionId: jobData.submissionId,
    title: generatedScenario.title,
    updatedAt: now,
  });

  return {
    processedAt: now,
    scenarioId,
    title: generatedScenario.title,
  };
}

export function setScenarioGeneratorForTests(generator: ((prompt: string) => Promise<GeneratedScenario>) | null) {
  scenarioGeneratorOverride = generator;
}

migrateDatabase();

export const scenarioGenerateWorker = new Worker<ScenarioGenerateJobData>(
  scenarioGenerateQueueName,
  async (job) => {
    const startedMessage = createStartedScenarioGenerateProgressMessage(String(job.id), job.data);

    await saveScenarioGenerateSnapshot(startedMessage);
    await publishScenarioGenerateProgress(startedMessage);

    if (process.env.NODE_ENV !== "production" && job.data.shouldFail) {
      throw new Error("Scenario generation failed");
    }

    const generatedScenario = await generateScenario(job.data.message);
    const persistedScenario = await persistScenario(generatedScenario, job.data);

    const completedMessage = createCompletedScenarioGenerateProgressMessage(
      String(job.id),
      job.data,
      persistedScenario.processedAt,
      persistedScenario.title,
    );

    await saveScenarioGenerateSnapshot(completedMessage);
    await publishScenarioGenerateProgress(completedMessage);

    return persistedScenario;
  },
  {
    connection: workerRedis,
  },
);

scenarioGenerateWorker.on("completed", (job) => {
  console.log(`scenario.generate job ${job.id} completed`);
});

scenarioGenerateWorker.on("failed", async (job, error) => {
  if (job) {
    const failedMessage = createFailedScenarioGenerateProgressMessage(String(job.id), job.data, error.message);

    await saveScenarioGenerateSnapshot(failedMessage);
    await publishScenarioGenerateProgress(failedMessage);
  }

  console.error(`scenario.generate job ${job?.id ?? "unknown"} failed`, error);
});

export async function persistQueuedScenarioGenerateJob(jobId: string, jobData: ScenarioGenerateJobData) {
  const queuedMessage = createQueuedScenarioGenerateProgressMessage(jobId, jobData);

  await saveScenarioGenerateSnapshot(queuedMessage);
  await publishScenarioGenerateProgress(queuedMessage);

  return queuedMessage;
}
