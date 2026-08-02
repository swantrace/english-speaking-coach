import type { SessionType } from "@english-coach/contract/session";
import { db } from "@english-coach/database";
import { type SessionProcessingStatus, sessionProcessing } from "@english-coach/database/schema";
import { and, eq } from "drizzle-orm";

export const sessionProcessingStages = ["analysis", "rewrittenTranscript", "dialogueAudio", "knowledge"] as const;

export type SessionProcessingStage = (typeof sessionProcessingStages)[number];
export type SessionProcessingInitialStatuses = Record<SessionProcessingStage, SessionProcessingStatus>;

export function getInitialSessionProcessingStatuses(sessionType: SessionType): SessionProcessingInitialStatuses {
  const supportsRewrittenDialogue = sessionType === "role-play";

  return {
    analysis: "queued",
    dialogueAudio: supportsRewrittenDialogue ? "queued" : "not_applicable",
    knowledge: "queued",
    rewrittenTranscript: supportsRewrittenDialogue ? "queued" : "not_applicable",
  };
}

const allowedTransitions: Record<SessionProcessingStatus, readonly SessionProcessingStatus[]> = {
  failed: ["failed", "queued", "processing"],
  not_applicable: ["not_applicable"],
  processing: ["processing", "ready", "failed"],
  queued: ["queued", "processing", "failed"],
  ready: ["ready", "queued", "processing"],
};

const stageFields = {
  analysis: { error: "analysisError", status: "analysisStatus" },
  dialogueAudio: { error: "dialogueAudioError", status: "dialogueAudioStatus" },
  knowledge: { error: "knowledgeError", status: "knowledgeStatus" },
  rewrittenTranscript: { error: "rewrittenTranscriptError", status: "rewrittenTranscriptStatus" },
} as const;

const stageStatusColumns = {
  analysis: sessionProcessing.analysisStatus,
  dialogueAudio: sessionProcessing.dialogueAudioStatus,
  knowledge: sessionProcessing.knowledgeStatus,
  rewrittenTranscript: sessionProcessing.rewrittenTranscriptStatus,
} as const;

type SessionProcessingRecord = typeof sessionProcessing.$inferSelect;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.trim();
  }

  if (typeof error === "string") {
    return error.trim();
  }

  if (error === undefined || error === null) {
    return "";
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function getStageStatus(record: SessionProcessingRecord, stage: SessionProcessingStage) {
  return record[stageFields[stage].status];
}

function buildStageUpdate(stage: SessionProcessingStage, status: SessionProcessingStatus, error: string | null) {
  switch (stage) {
    case "analysis":
      return { analysisError: error, analysisStatus: status };
    case "rewrittenTranscript":
      return { rewrittenTranscriptError: error, rewrittenTranscriptStatus: status };
    case "dialogueAudio":
      return { dialogueAudioError: error, dialogueAudioStatus: status };
    case "knowledge":
      return { knowledgeError: error, knowledgeStatus: status };
  }
}

export async function getSessionProcessing(sessionHistoryId: string) {
  const [record] = await db
    .select()
    .from(sessionProcessing)
    .where(eq(sessionProcessing.sessionHistoryId, sessionHistoryId))
    .limit(1);

  return record ?? null;
}

export async function initializeSessionProcessing({
  initialStatuses,
  sessionHistoryId,
}: {
  initialStatuses: SessionProcessingInitialStatuses;
  sessionHistoryId: string;
}) {
  const now = new Date().toISOString();

  await db
    .insert(sessionProcessing)
    .values({
      analysisStatus: initialStatuses.analysis,
      createdAt: now,
      dialogueAudioStatus: initialStatuses.dialogueAudio,
      knowledgeStatus: initialStatuses.knowledge,
      rewrittenTranscriptStatus: initialStatuses.rewrittenTranscript,
      sessionHistoryId,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: sessionProcessing.sessionHistoryId });

  const record = await getSessionProcessing(sessionHistoryId);

  if (!record) {
    throw new Error(`Failed to initialize processing state for session ${sessionHistoryId}`);
  }

  return record;
}

export async function transitionSessionProcessingStage({
  error,
  sessionHistoryId,
  stage,
  status,
}: {
  error?: unknown;
  sessionHistoryId: string;
  stage: SessionProcessingStage;
  status: SessionProcessingStatus;
}) {
  const current = await getSessionProcessing(sessionHistoryId);

  if (!current) {
    throw new Error(`Processing state not found for session ${sessionHistoryId}`);
  }

  const currentStatus = getStageStatus(current, stage);

  if (!allowedTransitions[currentStatus].includes(status)) {
    throw new Error(`Cannot transition ${stage} from ${currentStatus} to ${status}`);
  }

  const errorMessage = status === "failed" ? getErrorMessage(error) : null;

  if (status === "failed" && !errorMessage) {
    throw new Error(`A failure reason is required when ${stage} enters failed status`);
  }

  const [updated] = await db
    .update(sessionProcessing)
    .set({
      ...buildStageUpdate(stage, status, errorMessage),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(sessionProcessing.sessionHistoryId, sessionHistoryId), eq(stageStatusColumns[stage], currentStatus)))
    .returning();

  if (!updated) {
    throw new Error(`Processing state changed concurrently for session ${sessionHistoryId}`);
  }

  return updated;
}
