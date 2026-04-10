import { describe, expect, test } from "bun:test";
import { db } from "@english-coach/database";
import { freeFormContexts, sessionHistory, sessionTranscripts } from "@english-coach/database/schema";
import { app } from "./api";

async function signUpAndCreateSession(label: string) {
  const email = `history-${label}-${Date.now()}@example.com`;
  const password = "password1234";

  const signUpResponse = await app.request("http://localhost/api/auth/sign-up/email", {
    body: JSON.stringify({
      email,
      name: `${label} Tester`,
      password,
    }),
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost:5173",
    },
    method: "POST",
  });

  expect(signUpResponse.status).toBe(200);

  const cookie = signUpResponse.headers.get("set-cookie");

  expect(cookie).toBeTruthy();

  if (!cookie) {
    throw new Error("Expected Better Auth sign-up response to set a session cookie");
  }

  const sessionResponse = await app.request("http://localhost/api/session", {
    headers: {
      Cookie: cookie,
    },
  });

  expect(sessionResponse.status).toBe(200);

  const sessionBody = (await sessionResponse.json()) as {
    user: { id: string };
  };

  return {
    cookie,
    userId: sessionBody.user.id,
  };
}

describe("history detail transcript annotations", () => {
  test("returns persisted live and post-session transcript annotation metadata", async () => {
    const student = await signUpAndCreateSession("annotations");
    const now = new Date().toISOString();
    const freeFormContextId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();

    await db.insert(freeFormContexts).values({
      content: "Talk about what happened yesterday.",
      createdAt: now,
      id: freeFormContextId,
    });

    await db.insert(sessionHistory).values({
      endedAt: now,
      freeFormContextId,
      id: sessionId,
      review: "Short review",
      sessionType: "free-form",
      startedAt: now,
      userId: student.userId,
    });

    await db.insert(sessionTranscripts).values({
      annotations: [
        {
          coachingKind: "error_hint",
          id: `annotation-live-${sessionId}`,
          kind: "coaching",
          source: "free-form-live",
          text: "Ask the agent why the tense changes here.",
          transcriptTurnIndex: 0,
        },
        {
          coachingKind: "knowledge_hint",
          id: `annotation-review-${sessionId}`,
          kind: "coaching",
          source: "post-session-review",
          text: 'Ask the agent how "I went to the cafe yesterday" helps express time.',
          transcriptTurnIndex: 2,
        },
      ],
      createdAt: now,
      id: crypto.randomUUID(),
      rewrittenTurns: [
        {
          text: "I went to the cafe yesterday.",
          transcriptTurnIndex: 0,
        },
      ],
      sessionHistoryId: sessionId,
      turns: [
        { speaker: "user", text: "I goed to the cafe yesterday.", timestampMs: 1_000 },
        { speaker: "assistant", text: "What did you do there?", timestampMs: 2_000 },
        { speaker: "user", text: "I went to the cafe yesterday.", timestampMs: 3_000 },
      ],
    });

    const response = await app.request(`http://localhost/api/history/${sessionId}`, {
      headers: {
        Cookie: student.cookie,
      },
    });

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      rewrittenTranscript: Array<{ text: string; transcriptTurnIndex: number }>;
      transcriptAnnotations: Array<{
        coachingKind?: string;
        kind: string;
        source?: string;
        text: string;
        transcriptTurnIndex: number;
      }>;
      transcriptTurnAnchors: Array<{ id: string; turnLabel: string; transcriptTurnIndex: number }>;
    };

    expect(body.rewrittenTranscript).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "I went to the cafe yesterday.", transcriptTurnIndex: 0 }),
      ]),
    );
    expect(body.transcriptAnnotations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          coachingKind: "error_hint",
          kind: "coaching",
          source: "free-form-live",
          text: "Ask the agent why the tense changes here.",
          transcriptTurnIndex: 0,
        }),
        expect.objectContaining({
          coachingKind: "knowledge_hint",
          kind: "coaching",
          source: "post-session-review",
          text: 'Ask the agent how "I went to the cafe yesterday" helps express time.',
          transcriptTurnIndex: 2,
        }),
      ]),
    );
    expect(body.transcriptTurnAnchors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "turn-0", transcriptTurnIndex: 0, turnLabel: "Turn 1" }),
        expect.objectContaining({ id: "turn-2", transcriptTurnIndex: 2, turnLabel: "Turn 3" }),
      ]),
    );
  });
});
