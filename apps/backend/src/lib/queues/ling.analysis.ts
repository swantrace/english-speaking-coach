import {
  type LingAnalysisResult,
  lingAnalysisJobName,
  lingAnalysisQueueName,
  lingAnalysisResultSchema,
} from "@english-coach/contract/session";
import { db } from "@english-coach/database";
import { sessionErrors, sessionHistory, sessionTranscripts } from "@english-coach/database/schema";
import { type Job, Queue, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getProvider, modelConfig } from "../ai";
import { defaultProviderId } from "../env";
import { producerRedis, workerRedis } from "../redis";
import { persistRewrittenTranscriptTurnsForSession } from "./helpers/session-transcripts.persistence";
import { logWorkerCompleted, logWorkerFailed } from "./helpers/worker-logging";

type TranscriptTurns = typeof sessionTranscripts.$inferSelect.turns;
const lingAnalysisJobDataSchema = z.object({ sessionHistoryId: z.string().min(1) });

export const lingAnalysisQueue = new Queue<{ sessionHistoryId: string }>(lingAnalysisQueueName, {
  connection: producerRedis,
});

const sessionAi = getProvider(defaultProviderId).session;
const models = modelConfig[defaultProviderId];

let lingAnalysisGeneratorOverride: ((turns: TranscriptTurns) => Promise<LingAnalysisResult>) | null = null;

async function generateLingAnalysis(sessionHistoryId: string, turns: TranscriptTurns) {
  if (lingAnalysisGeneratorOverride) {
    return lingAnalysisResultSchema.parse(await lingAnalysisGeneratorOverride(turns));
  }

  const result = await sessionAi.generateLingAnalysis(
    models.LING_ANALYSIS_MODEL,
    {
      turns,
    },
    {
      sessionHistoryId,
    },
  );

  return lingAnalysisResultSchema.parse(result);
}

export async function processLingAnalysisSession(sessionHistoryId: string) {
  const [transcriptRecord] = await db
    .select()
    .from(sessionTranscripts)
    .where(eq(sessionTranscripts.sessionHistoryId, sessionHistoryId))
    .limit(1);

  if (!transcriptRecord) {
    throw new Error(`Transcript not found for session ${sessionHistoryId}`);
  }

  const analysis = await generateLingAnalysis(sessionHistoryId, transcriptRecord.turns);

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

async function handleLingAnalysisJob(job: Job<{ sessionHistoryId: string }>) {
  // Step 1: validate the job payload
  const { sessionHistoryId } = lingAnalysisJobDataSchema.parse(job.data);

  // Step 2: run the analysis workflow for the transcript
  const analysis = await processLingAnalysisSession(sessionHistoryId);

  // Step 3: return the completed analysis result
  return analysis;
}

export const lingAnalysisWorker = new Worker<{ sessionHistoryId: string }>(
  lingAnalysisQueueName,
  handleLingAnalysisJob,
  {
    connection: workerRedis,
  },
);

lingAnalysisWorker.on("completed", (job) => {
  logWorkerCompleted(lingAnalysisJobName, job);
});

lingAnalysisWorker.on("failed", (job, error) => {
  logWorkerFailed(lingAnalysisJobName, job, error);
});

export function setLingAnalysisGeneratorForTests(
  generator: ((turns: TranscriptTurns) => Promise<LingAnalysisResult>) | null,
) {
  lingAnalysisGeneratorOverride = generator;
}
