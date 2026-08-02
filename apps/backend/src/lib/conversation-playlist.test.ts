import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db, migrateDatabase } from "@english-coach/database";
import { mediaAssets, scenarios, sessionHistory, sessionProcessing, user } from "@english-coach/database/schema";
import { eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import type { AppVariables } from "../http/context";
import { registerHistoryRoutes } from "../routes/history";

const runId = crypto.randomUUID();
const ownerId = `playlist-owner-${runId}`;
const otherId = `playlist-other-${runId}`;
const scenarioId = `playlist-scenario-${runId}`;
const sessionId = `playlist-session-${runId}`;
const assetId = `playlist-asset-${runId}`;

function createApp(userId: string | null) {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use("*", async (context, next) => {
    context.set("session", null);
    context.set(
      "user",
      userId
        ? ({ email: `${userId}@example.com`, id: userId, name: "Playlist learner", role: "student" } as never)
        : null,
    );
    await next();
  });
  registerHistoryRoutes(app);
  return app;
}

describe("conversation audio playlist", () => {
  beforeAll(async () => {
    await migrateDatabase();
    const now = new Date().toISOString();
    await db.insert(user).values([
      { email: `${ownerId}@example.com`, id: ownerId, name: "Playlist owner", status: "approved" },
      { email: `${otherId}@example.com`, id: otherId, name: "Other learner", status: "approved" },
    ]);
    await db.insert(scenarios).values({
      characters: [
        { description: "A guest", name: "Guest" },
        { description: "A receptionist", name: "Receptionist" },
      ],
      createdAt: now,
      exampleDialogue: [{ characterIndex: 0, text: "I'd like to change rooms." }],
      goals: { goals: [], intents: [], slots: [] },
      id: scenarioId,
      setting: "A hotel guest asks to change rooms.",
      tags: [],
      title: "Changing hotel rooms",
      updatedAt: now,
    });
    await db.insert(sessionHistory).values({
      endedAt: now,
      id: sessionId,
      scenarioId,
      selectedCharacterIndex: 0,
      sessionType: "role-play",
      startedAt: now,
      userId: ownerId,
    });
    await db.insert(mediaAssets).values({
      bucket: "playlist-test",
      byteSize: 10_000,
      checksumSha256: "b".repeat(64),
      contentType: "audio/wav",
      createdAt: now,
      durationMs: 42_000,
      id: assetId,
      kind: "corrected_dialogue",
      objectKey: `private/users/${ownerId}/corrected_dialogue/${assetId}.wav`,
      status: "ready",
      updatedAt: now,
      userId: ownerId,
    });
    await db.insert(sessionProcessing).values({
      analysisStatus: "ready",
      createdAt: now,
      dialogueAudioAssetId: assetId,
      dialogueAudioStatus: "ready",
      knowledgeStatus: "ready",
      rewrittenTranscriptStatus: "ready",
      sessionHistoryId: sessionId,
      updatedAt: now,
    });
  });

  afterAll(async () => {
    await db.delete(sessionHistory).where(eq(sessionHistory.id, sessionId));
    await db.delete(mediaAssets).where(eq(mediaAssets.id, assetId));
    await db.delete(scenarios).where(eq(scenarios.id, scenarioId));
    await db.delete(user).where(inArray(user.id, [ownerId, otherId]));
  });

  it("returns only the signed-in learner's ready corrected conversations", async () => {
    const response = await createApp(ownerId).request("/api/history/audio-playlist");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        {
          assetId,
          contentType: "audio/wav",
          durationMs: 42_000,
          endedAt: expect.any(String),
          sessionId,
          title: "Changing hotel rooms",
        },
      ],
    });

    expect(await (await createApp(otherId).request("/api/history/audio-playlist")).json()).toEqual({ items: [] });
    expect((await createApp(null).request("/api/history/audio-playlist")).status).toBe(401);
  });
});
