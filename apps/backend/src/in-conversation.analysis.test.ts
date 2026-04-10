import { beforeEach, describe, expect, test } from "bun:test";
import { db } from "@english-coach/database";
import { freeFormContexts, sessionHistory, sessionTranscripts } from "@english-coach/database/schema";
import { eq } from "drizzle-orm";
import {
  mergeTranscriptTurns,
  persistRewrittenTranscriptTurnsForSession,
  persistTranscriptAnnotationsForSession,
  persistTranscriptBatchForSession,
} from "./lib/queues/in-conversation.analysis";

describe("inConversationAnalysis transcript persistence", () => {
  beforeEach(async () => {
    const sessionId = `test-freeform-${Date.now()}`;
    await db.delete(sessionTranscripts).where(eq(sessionTranscripts.sessionHistoryId, sessionId));
  });

  test("mergeTranscriptTurns appends new turns and ignores exact duplicates", () => {
    const merged = mergeTranscriptTurns(
      [{ speaker: "user", text: "Hello", timestampMs: 1_000 }],
      [
        { speaker: "user", text: "Hello", timestampMs: 1_000 },
        { speaker: "assistant", text: "Hi there", timestampMs: 2_000 },
      ],
    );

    expect(merged).toEqual([
      { speaker: "user", text: "Hello", timestampMs: 1_000 },
      { speaker: "assistant", text: "Hi there", timestampMs: 2_000 },
    ]);
  });

  test("persists free-form transcript batches before final session shutdown", async () => {
    const now = new Date().toISOString();
    const freeFormContextId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();

    await db.insert(freeFormContexts).values({
      content: "Practice a conversation about travel plans.",
      createdAt: now,
      id: freeFormContextId,
    });

    await db.insert(sessionHistory).values({
      freeFormContextId,
      id: sessionId,
      sessionType: "free-form",
      startedAt: now,
      userId: "system",
    });

    await persistTranscriptBatchForSession(sessionId, [
      { speaker: "user", text: "I want to talk about my trip.", timestampMs: 1_000 },
      { speaker: "assistant", text: "Great, where are you going?", timestampMs: 2_000 },
    ]);

    await persistTranscriptBatchForSession(sessionId, [
      { speaker: "assistant", text: "Great, where are you going?", timestampMs: 2_000 },
      { speaker: "user", text: "I am going to Spain next month.", timestampMs: 3_000 },
    ]);

    const [transcriptRecord] = await db
      .select()
      .from(sessionTranscripts)
      .where(eq(sessionTranscripts.sessionHistoryId, sessionId))
      .limit(1);

    expect(transcriptRecord?.turns).toEqual([
      { speaker: "user", text: "I want to talk about my trip.", timestampMs: 1_000 },
      { speaker: "assistant", text: "Great, where are you going?", timestampMs: 2_000 },
      { speaker: "user", text: "I am going to Spain next month.", timestampMs: 3_000 },
    ]);
  });

  test("preserves transcript annotations and rewritten turns when later transcript batches arrive", async () => {
    const now = new Date().toISOString();
    const freeFormContextId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();

    await db.insert(freeFormContexts).values({
      content: "Practice talking about yesterday.",
      createdAt: now,
      id: freeFormContextId,
    });

    await db.insert(sessionHistory).values({
      freeFormContextId,
      id: sessionId,
      sessionType: "free-form",
      startedAt: now,
      userId: "system",
    });

    await persistTranscriptAnnotationsForSession(sessionId, [
      {
        id: "annotation-1",
        kind: "coaching",
        text: "Ask why the past tense changes here.",
        transcriptTurnIndex: 0,
      },
    ]);

    await persistRewrittenTranscriptTurnsForSession(sessionId, [
      {
        text: "I went to the cafe yesterday.",
        transcriptTurnIndex: 0,
      },
    ]);

    await persistTranscriptBatchForSession(sessionId, [
      { speaker: "user", text: "I goed to the cafe yesterday.", timestampMs: 1_000 },
      { speaker: "assistant", text: "What happened next?", timestampMs: 2_000 },
    ]);

    const [transcriptRecord] = await db
      .select()
      .from(sessionTranscripts)
      .where(eq(sessionTranscripts.sessionHistoryId, sessionId))
      .limit(1);

    expect(transcriptRecord?.annotations).toEqual([
      {
        id: "annotation-1",
        kind: "coaching",
        text: "Ask why the past tense changes here.",
        transcriptTurnIndex: 0,
      },
    ]);
    expect(transcriptRecord?.rewrittenTurns).toEqual([
      {
        text: "I went to the cafe yesterday.",
        transcriptTurnIndex: 0,
      },
    ]);
    expect(transcriptRecord?.turns).toHaveLength(2);
  });
});
