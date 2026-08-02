import {
  type DialogueAudioJob,
  dialogueAudioJobName,
  dialogueAudioJobSchema,
  dialogueAudioQueueName,
} from "@english-coach/contract/session";
import { db } from "@english-coach/database";
import { mediaAssets, sessionHistory, sessionProcessing, sessionTranscripts } from "@english-coach/database/schema";
import type { StorageProvider } from "@english-coach/storage";
import {
  createPrivateMediaObjectKey,
  getStorageConfig,
  getStorageProvider,
  uploadPrivateMedia,
} from "@english-coach/storage";
import { type Job, Queue, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import {
  buildCorrectedDialogueTurns,
  createCartesiaDialogueSynthesizer,
  createPcmSilence,
  DIALOGUE_AUDIO_PAUSE_MS,
  type DialogueSpeechSynthesizer,
  getDialogueAudioVoiceIds,
  getPcmDurationMs,
  wrapPcmS16LeInWav,
} from "../dialogue-audio";
import { cleanupPrivateMediaAsset } from "../private-media-cleanup";
import { producerRedis, workerRedis } from "../redis";
import { transitionAndPublishSessionProcessingStage } from "../session-processing-events";
import { logWorkerCompleted, logWorkerFailed } from "./helpers/worker-logging";

export interface DialogueAudioDependencies {
  bucket: string;
  storage: StorageProvider;
  synthesizer: DialogueSpeechSynthesizer;
  voices: { assistant: string; user: string };
}

function getDefaultDependencies(): DialogueAudioDependencies {
  return {
    bucket: getStorageConfig().bucket,
    storage: getStorageProvider(),
    synthesizer: createCartesiaDialogueSynthesizer(),
    voices: getDialogueAudioVoiceIds(),
  };
}

export const dialogueAudioQueue = new Queue<DialogueAudioJob>(dialogueAudioQueueName, {
  connection: producerRedis,
});

export async function enqueueDialogueAudio(sessionHistoryId: string) {
  await dialogueAudioQueue.add(
    dialogueAudioJobName,
    { sessionHistoryId },
    {
      attempts: 3,
      backoff: { delay: 5_000, type: "exponential" },
      jobId: `${dialogueAudioJobName}-${sessionHistoryId}`,
      removeOnComplete: true,
      removeOnFail: false,
    },
  );
}

export async function processDialogueAudioSession(
  sessionHistoryId: string,
  dependencies: DialogueAudioDependencies = getDefaultDependencies(),
) {
  const [session] = await db
    .select({ sessionType: sessionHistory.sessionType, userId: sessionHistory.userId })
    .from(sessionHistory)
    .where(eq(sessionHistory.id, sessionHistoryId))
    .limit(1);
  const [transcript] = await db
    .select()
    .from(sessionTranscripts)
    .where(eq(sessionTranscripts.sessionHistoryId, sessionHistoryId))
    .limit(1);
  const processing = await db.query.sessionProcessing.findFirst({
    where: eq(sessionProcessing.sessionHistoryId, sessionHistoryId),
  });

  if (!session || session.sessionType !== "role-play") {
    throw new Error(`Role-play session not found for dialogue audio ${sessionHistoryId}`);
  }
  if (!transcript || !processing) {
    throw new Error(`Completed transcript not found for dialogue audio ${sessionHistoryId}`);
  }

  await transitionAndPublishSessionProcessingStage({
    sessionHistoryId,
    stage: "dialogueAudio",
    status: "processing",
  });

  const pause = createPcmSilence(DIALOGUE_AUDIO_PAUSE_MS);
  const pcmParts: Buffer[] = [];
  const correctedTurns = buildCorrectedDialogueTurns(transcript.turns, transcript.rewrittenTurns ?? []);

  for (const turn of correctedTurns) {
    const voiceId = turn.speaker === "user" ? dependencies.voices.user : dependencies.voices.assistant;
    const audio = await dependencies.synthesizer.synthesize(turn.text, voiceId);
    if (audio.byteLength === 0 || audio.byteLength % 2 !== 0) {
      throw new Error(`Cartesia returned invalid PCM for transcript turn ${turn.transcriptTurnIndex}`);
    }
    if (pcmParts.length > 0) {
      pcmParts.push(pause);
    }
    pcmParts.push(audio);
  }

  if (pcmParts.length === 0) {
    throw new Error(`Transcript has no turns for dialogue audio ${sessionHistoryId}`);
  }

  const pcm = Buffer.concat(pcmParts);
  const wav = wrapPcmS16LeInWav(pcm);
  const assetId = crypto.randomUUID();
  const objectKey = createPrivateMediaObjectKey({
    assetId,
    contentType: "audio/wav",
    kind: "corrected_dialogue",
    userId: session.userId,
  });
  let uploaded = false;

  try {
    const metadata = await uploadPrivateMedia(dependencies.storage, {
      buffer: wav,
      contentType: "audio/wav",
      key: objectKey,
      metadata: { assetid: assetId, sessionhistoryid: sessionHistoryId, userid: session.userId },
    });
    uploaded = true;
    const now = new Date().toISOString();

    await db.transaction(async (transaction) => {
      await transaction.insert(mediaAssets).values({
        bucket: dependencies.bucket,
        byteSize: metadata.byteSize,
        checksumSha256: metadata.checksumSha256,
        contentType: metadata.contentType,
        createdAt: now,
        durationMs: getPcmDurationMs(pcm),
        id: assetId,
        kind: "corrected_dialogue",
        objectKey: metadata.objectKey,
        status: "ready",
        updatedAt: now,
        userId: session.userId,
      });
      await transaction
        .update(sessionProcessing)
        .set({ dialogueAudioAssetId: assetId, updatedAt: now })
        .where(eq(sessionProcessing.sessionHistoryId, sessionHistoryId));
    });

    await transitionAndPublishSessionProcessingStage({
      sessionHistoryId,
      stage: "dialogueAudio",
      status: "ready",
    });

    if (processing.dialogueAudioAssetId) {
      await cleanupPrivateMediaAsset(processing.dialogueAudioAssetId, dependencies.storage).catch((error) => {
        console.error("Failed to clean up replaced dialogue audio", {
          assetId: processing.dialogueAudioAssetId,
          error,
          sessionHistoryId,
        });
      });
    }

    return { assetId, durationMs: getPcmDurationMs(pcm) };
  } catch (error) {
    if (uploaded) {
      await dependencies.storage.delete(objectKey).catch(() => undefined);
    }
    throw error;
  }
}

async function handleDialogueAudioJob(job: Job<DialogueAudioJob>) {
  const { sessionHistoryId } = dialogueAudioJobSchema.parse(job.data);
  try {
    return await processDialogueAudioSession(sessionHistoryId);
  } catch (error) {
    await transitionAndPublishSessionProcessingStage({
      error,
      sessionHistoryId,
      stage: "dialogueAudio",
      status: "failed",
    }).catch(() => undefined);
    throw error;
  }
}

export const dialogueAudioWorker = new Worker<DialogueAudioJob>(dialogueAudioQueueName, handleDialogueAudioJob, {
  connection: workerRedis,
});

dialogueAudioWorker.on("completed", (job) => logWorkerCompleted(dialogueAudioJobName, job));
dialogueAudioWorker.on("failed", (job, error) => logWorkerFailed(dialogueAudioJobName, job, error));
