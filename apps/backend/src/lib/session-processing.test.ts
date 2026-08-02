import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createSessionProcessingEvent, isSessionProcessingTerminal } from "@english-coach/contract/session";
import { db, migrateDatabase } from "@english-coach/database";
import { freeFormContexts, sessionHistory, user } from "@english-coach/database/schema";
import { eq } from "drizzle-orm";
import { persistSessionCompletion } from "./queues/helpers/session-completion.persistence";
import {
  getInitialSessionProcessingStatuses,
  getSessionProcessing,
  initializeSessionProcessing,
  transitionSessionProcessingStage,
} from "./session-processing";

const testRunId = crypto.randomUUID();
const userId = `session-processing-user-${testRunId}`;
const contextId = `session-processing-context-${testRunId}`;
const sessionId = `session-processing-session-${testRunId}`;

describe("session processing service", () => {
  beforeAll(async () => {
    await migrateDatabase();
    const now = new Date().toISOString();

    await db.insert(user).values({
      email: `session-processing-${testRunId}@example.com`,
      id: userId,
      name: "Session processing test user",
      role: "student",
      status: "approved",
    });
    await db.insert(freeFormContexts).values({
      content: "Test session processing states.",
      createdAt: now,
      id: contextId,
      summary: "Session processing test",
    });
    await db.insert(sessionHistory).values({
      freeFormContextId: contextId,
      id: sessionId,
      sessionType: "free-form",
      startedAt: now,
      userId,
    });
    await initializeSessionProcessing({
      initialStatuses: {
        analysis: "queued",
        dialogueAudio: "not_applicable",
        knowledge: "queued",
        rewrittenTranscript: "not_applicable",
      },
      sessionHistoryId: sessionId,
    });
  });

  afterAll(async () => {
    await db.delete(sessionHistory).where(eq(sessionHistory.id, sessionId));
    await db.delete(freeFormContexts).where(eq(freeFormContexts.id, contextId));
    await db.delete(user).where(eq(user.id, userId));
  });

  it("initializes and reads a durable processing record idempotently", async () => {
    const initialized = await getSessionProcessing(sessionId);

    expect(initialized).toMatchObject({
      analysisError: null,
      analysisStatus: "queued",
      dialogueAudioError: null,
      dialogueAudioStatus: "not_applicable",
      knowledgeError: null,
      knowledgeStatus: "queued",
      rewrittenTranscriptError: null,
      rewrittenTranscriptStatus: "not_applicable",
      sessionHistoryId: sessionId,
    });

    const repeated = await initializeSessionProcessing({
      initialStatuses: {
        analysis: "ready",
        dialogueAudio: "ready",
        knowledge: "ready",
        rewrittenTranscript: "ready",
      },
      sessionHistoryId: sessionId,
    });

    expect(repeated.analysisStatus).toBe("queued");
    expect(await getSessionProcessing(sessionId)).toEqual(repeated);
  });

  it("assigns rewritten dialogue work only to role-play sessions", () => {
    expect(getInitialSessionProcessingStatuses("role-play")).toEqual({
      analysis: "queued",
      dialogueAudio: "queued",
      knowledge: "queued",
      rewrittenTranscript: "queued",
    });
    expect(getInitialSessionProcessingStatuses("free-form")).toEqual({
      analysis: "queued",
      dialogueAudio: "not_applicable",
      knowledge: "queued",
      rewrittenTranscript: "not_applicable",
    });
  });

  it("creates self-contained processing events and detects terminal snapshots", async () => {
    const processing = await getSessionProcessing(sessionId);

    expect(processing).not.toBeNull();

    if (!processing) {
      throw new Error("Expected session processing test record");
    }

    expect(createSessionProcessingEvent(processing)).toEqual({
      processing,
      type: "session-processing.updated",
    });
    expect(isSessionProcessingTerminal(processing)).toBeFalse();
    expect(
      isSessionProcessingTerminal({
        ...processing,
        analysisStatus: "ready",
        knowledgeStatus: "failed",
      }),
    ).toBeTrue();
  });

  it("creates the processing snapshot when a session completes", async () => {
    const completedSessionId = `session-processing-completed-${testRunId}`;
    const now = new Date().toISOString();

    await db.insert(sessionHistory).values({
      freeFormContextId: contextId,
      id: completedSessionId,
      sessionType: "free-form",
      startedAt: now,
      userId,
    });

    try {
      await persistSessionCompletion({
        sessionHistoryId: completedSessionId,
        transcript: [{ speaker: "user", text: "I would like to practise English.", timestampMs: 0 }],
      });

      expect(await getSessionProcessing(completedSessionId)).toMatchObject({
        analysisStatus: "queued",
        dialogueAudioStatus: "not_applicable",
        knowledgeStatus: "queued",
        rewrittenTranscriptStatus: "not_applicable",
      });
    } finally {
      await db.delete(sessionHistory).where(eq(sessionHistory.id, completedSessionId));
    }
  });

  it("tracks failure and clears the error when a stage is retried", async () => {
    const processing = await transitionSessionProcessingStage({
      sessionHistoryId: sessionId,
      stage: "analysis",
      status: "processing",
    });
    expect(processing.analysisStatus).toBe("processing");
    expect(processing.analysisError).toBeNull();

    const failed = await transitionSessionProcessingStage({
      error: new Error("Model request failed"),
      sessionHistoryId: sessionId,
      stage: "analysis",
      status: "failed",
    });
    expect(failed.analysisStatus).toBe("failed");
    expect(failed.analysisError).toBe("Model request failed");

    const retried = await transitionSessionProcessingStage({
      sessionHistoryId: sessionId,
      stage: "analysis",
      status: "queued",
    });
    expect(retried.analysisStatus).toBe("queued");
    expect(retried.analysisError).toBeNull();
  });

  it("rejects invalid transitions and failures without a reason", async () => {
    await expect(
      transitionSessionProcessingStage({
        sessionHistoryId: sessionId,
        stage: "dialogueAudio",
        status: "processing",
      }),
    ).rejects.toThrow("Cannot transition dialogueAudio from not_applicable to processing");

    await expect(
      transitionSessionProcessingStage({
        sessionHistoryId: sessionId,
        stage: "knowledge",
        status: "failed",
      }),
    ).rejects.toThrow("A failure reason is required when knowledge enters failed status");
  });
});
