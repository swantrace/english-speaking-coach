import {
  type LingAnalysisResult,
  lingAnalysisJobName,
  lingAnalysisQueueName,
  lingAnalysisResultSchema,
} from "@english-coach/contract/session";
import { db } from "@english-coach/database";
import {
  sessionErrors,
  sessionHistory,
  sessionKnowledgePointOccurrences,
  sessionTranscripts,
} from "@english-coach/database/schema";
import { type Job, Queue, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getProvider, resolveLingAnalysisModelRoute } from "../ai";
import { normalizeLingAnalysisForSessionType } from "../ai/handlers/session";
import { producerRedis, workerRedis } from "../redis";
import { getInitialSessionProcessingStatuses, initializeSessionProcessing } from "../session-processing";
import { transitionAndPublishSessionProcessingStage } from "../session-processing-events";
import { persistKnowledgeOccurrencesForSession } from "./helpers/knowledge-occurrences.persistence";
import { replaceRewrittenTranscriptTurnsForSession } from "./helpers/session-transcripts.persistence";
import { logWorkerCompleted, logWorkerFailed } from "./helpers/worker-logging";
import { enqueueKnowledgeOccurrenceEnrichment } from "./knowledge-occurrence.resolve";

type TranscriptTurns = typeof sessionTranscripts.$inferSelect.turns;
const lingAnalysisJobDataSchema = z.object({ sessionHistoryId: z.string().min(1) });

export const lingAnalysisQueue = new Queue<{ sessionHistoryId: string }>(lingAnalysisQueueName, {
  connection: producerRedis,
});

const lingAnalysisModelRoute = resolveLingAnalysisModelRoute();
const sessionAi = getProvider(lingAnalysisModelRoute.providerId).session;

type SessionType = typeof sessionHistory.$inferSelect.sessionType;
type LingAnalysisGenerator = (turns: TranscriptTurns, sessionType: SessionType) => Promise<LingAnalysisResult>;

let lingAnalysisGeneratorOverride: LingAnalysisGenerator | null = null;

async function generateLingAnalysis(sessionHistoryId: string, sessionType: SessionType, turns: TranscriptTurns) {
  if (lingAnalysisGeneratorOverride) {
    const analysis = lingAnalysisResultSchema.parse(await lingAnalysisGeneratorOverride(turns, sessionType));
    return normalizeLingAnalysisForSessionType(analysis, sessionType);
  }

  const result = await sessionAi.generateLingAnalysis(
    lingAnalysisModelRoute.modelId,
    {
      sessionType,
      turns,
    },
    {
      sessionHistoryId,
    },
  );

  return normalizeLingAnalysisForSessionType(lingAnalysisResultSchema.parse(result), sessionType);
}

export async function processLingAnalysisSession(sessionHistoryId: string) {
  const [sessionRecord] = await db
    .select({ sessionType: sessionHistory.sessionType })
    .from(sessionHistory)
    .where(eq(sessionHistory.id, sessionHistoryId))
    .limit(1);

  if (!sessionRecord) {
    throw new Error(`Session not found for linguistic analysis ${sessionHistoryId}`);
  }

  const [transcriptRecord] = await db
    .select()
    .from(sessionTranscripts)
    .where(eq(sessionTranscripts.sessionHistoryId, sessionHistoryId))
    .limit(1);

  if (!transcriptRecord) {
    throw new Error(`Transcript not found for session ${sessionHistoryId}`);
  }

  await initializeSessionProcessing({
    initialStatuses: getInitialSessionProcessingStatuses(sessionRecord.sessionType),
    sessionHistoryId,
  });

  await Promise.all([
    transitionAndPublishSessionProcessingStage({ sessionHistoryId, stage: "analysis", status: "processing" }),
    transitionAndPublishSessionProcessingStage({ sessionHistoryId, stage: "knowledge", status: "processing" }),
    ...(sessionRecord.sessionType === "role-play"
      ? [
          transitionAndPublishSessionProcessingStage({
            sessionHistoryId,
            stage: "dialogueAudio",
            status: "queued",
          }),
          transitionAndPublishSessionProcessingStage({
            sessionHistoryId,
            stage: "rewrittenTranscript",
            status: "processing",
          }),
        ]
      : []),
  ]);

  let analysis: LingAnalysisResult;

  try {
    analysis = await generateLingAnalysis(sessionHistoryId, sessionRecord.sessionType, transcriptRecord.turns);

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

    await replaceRewrittenTranscriptTurnsForSession(sessionHistoryId, analysis.rewrittenUserTurns);
  } catch (error) {
    await Promise.allSettled([
      transitionAndPublishSessionProcessingStage({ error, sessionHistoryId, stage: "analysis", status: "failed" }),
      transitionAndPublishSessionProcessingStage({ error, sessionHistoryId, stage: "knowledge", status: "failed" }),
      ...(sessionRecord.sessionType === "role-play"
        ? [
            transitionAndPublishSessionProcessingStage({
              error,
              sessionHistoryId,
              stage: "dialogueAudio",
              status: "failed",
            }),
            transitionAndPublishSessionProcessingStage({
              error,
              sessionHistoryId,
              stage: "rewrittenTranscript",
              status: "failed",
            }),
          ]
        : []),
    ]);
    throw error;
  }

  await Promise.all([
    transitionAndPublishSessionProcessingStage({ sessionHistoryId, stage: "analysis", status: "ready" }),
    ...(sessionRecord.sessionType === "role-play"
      ? [
          transitionAndPublishSessionProcessingStage({
            sessionHistoryId,
            stage: "rewrittenTranscript",
            status: "ready",
          }),
        ]
      : []),
  ]);

  try {
    const occurrenceIds = await persistKnowledgeOccurrencesForSession(
      sessionHistoryId,
      transcriptRecord.turns,
      analysis.occurrences,
    );
    await enqueueKnowledgeOccurrenceEnrichment(occurrenceIds);

    if (occurrenceIds.length === 0) {
      await transitionAndPublishSessionProcessingStage({ sessionHistoryId, stage: "knowledge", status: "ready" });
    }
  } catch (error) {
    await transitionAndPublishSessionProcessingStage({
      error,
      sessionHistoryId,
      stage: "knowledge",
      status: "failed",
    });
    throw error;
  }

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

export function setLingAnalysisGeneratorForTests(generator: LingAnalysisGenerator | null) {
  lingAnalysisGeneratorOverride = generator;
}
