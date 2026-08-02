import type { SessionTurn } from "@english-coach/contract/session";
import { db } from "@english-coach/database";
import { sessionHistory } from "@english-coach/database/schema";
import { eq } from "drizzle-orm";
import { getInitialSessionProcessingStatuses, initializeSessionProcessing } from "../../session-processing";
import { persistTranscriptBatchForSession } from "./session-transcripts.persistence";

export async function persistSessionCompletion({
  completedGoals,
  sessionHistoryId,
  transcript,
}: {
  completedGoals?: string[];
  sessionHistoryId: string;
  transcript: SessionTurn[];
}) {
  const [existingSession] = await db
    .select({
      completedGoals: sessionHistory.completedGoals,
      id: sessionHistory.id,
      sessionType: sessionHistory.sessionType,
    })
    .from(sessionHistory)
    .where(eq(sessionHistory.id, sessionHistoryId))
    .limit(1);

  if (!existingSession) {
    throw new Error(`Session not found for completion ${sessionHistoryId}`);
  }

  await persistTranscriptBatchForSession(sessionHistoryId, transcript);
  await db
    .update(sessionHistory)
    .set({
      completedGoals: completedGoals ?? existingSession.completedGoals ?? [],
      endedAt: new Date().toISOString(),
    })
    .where(eq(sessionHistory.id, sessionHistoryId));

  await initializeSessionProcessing({
    initialStatuses: getInitialSessionProcessingStatuses(existingSession.sessionType),
    sessionHistoryId,
  });
}
