import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db, migrateDatabase } from "@english-coach/database";
import { mediaAssets, scenarios, user } from "@english-coach/database/schema";
import type { StorageProvider, StorageUploadOptions } from "@english-coach/storage";
import { eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import type { AppVariables } from "../http/context";
import { registerMediaRoutes } from "../routes/media";
import { registerScenarioImageRoutes } from "../routes/scenario-images";
import { registerScenarioRoutes } from "../routes/scenarios";
import { cleanupPrivateMediaAsset } from "./private-media-cleanup";

const runId = crypto.randomUUID();
const adminId = `scenario-image-admin-${runId}`;
const learnerId = `scenario-image-learner-${runId}`;
const scenarioId = `scenario-image-${runId}`;
const bucket = "scenario-image-test";
const deletedKeys: string[] = [];
const uploads: Array<{ key: string; options?: StorageUploadOptions }> = [];

const storage: StorageProvider = {
  delete: async (key) => {
    deletedKeys.push(key);
  },
  download: async () => Buffer.alloc(0),
  exists: async () => true,
  getSignedUrl: async (key, expiresIn) => `https://media.example.com/${encodeURIComponent(key)}?ttl=${expiresIn}`,
  list: async () => [],
  upload: async (key, _buffer, options) => {
    uploads.push({ key, options });
  },
};

function createApp(userId: string | null, role: "admin" | "student") {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use("*", async (context, next) => {
    context.set("session", null);
    context.set(
      "user",
      userId ? ({ email: `${userId}@example.com`, id: userId, name: "Scenario image test", role } as never) : null,
    );
    await next();
  });
  registerScenarioImageRoutes(app, { getStorage: () => ({ bucket, provider: storage }) });
  registerMediaRoutes(app, {
    getMediaAccessSigner: () => ({
      bucket,
      getSignedUrl: (key, expiresIn) => storage.getSignedUrl(key, expiresIn),
    }),
  });
  registerScenarioRoutes(app, {
    cleanupScenarioImage: (assetId) => cleanupPrivateMediaAsset(assetId, storage),
  });
  return app;
}

function imageRequest(name = "scenario.png", type = "image/png") {
  const body = new FormData();
  body.set("file", new File([new Uint8Array([137, 80, 78, 71])], name, { type }));
  return { body, method: "POST" };
}

describe("private scenario image lifecycle", () => {
  beforeAll(async () => {
    await migrateDatabase();
    await db.insert(user).values([
      { email: `${adminId}@example.com`, id: adminId, name: "Image admin", role: "admin", status: "approved" },
      {
        email: `${learnerId}@example.com`,
        id: learnerId,
        name: "Image learner",
        role: "student",
        status: "approved",
      },
    ]);
    const now = new Date().toISOString();
    await db.insert(scenarios).values({
      characters: [
        { description: "A guest", name: "Guest" },
        { description: "A receptionist", name: "Receptionist" },
      ],
      createdAt: now,
      exampleDialogue: [{ characterIndex: 0, text: "Could I change rooms?" }],
      goals: { goals: [], intents: [], slots: [] },
      id: scenarioId,
      isPendingReview: false,
      setting: "A guest asks to change rooms at a hotel reception.",
      tags: ["hotel"],
      title: "Changing hotel rooms",
      updatedAt: now,
    });
  });

  afterAll(async () => {
    await db.delete(scenarios).where(eq(scenarios.id, scenarioId));
    await db.delete(mediaAssets).where(eq(mediaAssets.userId, adminId));
    await db.delete(user).where(inArray(user.id, [adminId, learnerId]));
  });

  it("rejects non-admin and unsupported uploads", async () => {
    expect(
      (await createApp(learnerId, "student").request(`/api/admin/scenarios/${scenarioId}/image`, imageRequest()))
        .status,
    ).toBe(403);
    expect(
      (
        await createApp(adminId, "admin").request(
          `/api/admin/scenarios/${scenarioId}/image`,
          imageRequest("scenario.svg", "image/svg+xml"),
        )
      ).status,
    ).toBe(415);
  });

  it("uploads, authorizes, replaces, and cleans up scenario images", async () => {
    const adminApp = createApp(adminId, "admin");
    const firstResponse = await adminApp.request(`/api/admin/scenarios/${scenarioId}/image`, imageRequest());
    expect(firstResponse.status).toBe(201);
    const { assetId: firstAssetId } = (await firstResponse.json()) as { assetId: string };
    expect(uploads[0]).toMatchObject({
      key: expect.stringContaining(`/scenario_image/${firstAssetId}.png`),
      options: { contentType: "image/png" },
    });

    const learnerApp = createApp(learnerId, "student");
    expect((await learnerApp.request(`/api/media/${firstAssetId}/access`)).status).toBe(200);

    await db.update(scenarios).set({ isPendingReview: true }).where(eq(scenarios.id, scenarioId));
    expect((await learnerApp.request(`/api/media/${firstAssetId}/access`)).status).toBe(404);
    expect((await adminApp.request(`/api/media/${firstAssetId}/access`)).status).toBe(200);
    await db.update(scenarios).set({ isPendingReview: false }).where(eq(scenarios.id, scenarioId));

    const secondResponse = await adminApp.request(`/api/admin/scenarios/${scenarioId}/image`, imageRequest());
    expect(secondResponse.status).toBe(201);
    const { assetId: secondAssetId } = (await secondResponse.json()) as { assetId: string };
    expect(deletedKeys.some((key) => key.includes(firstAssetId))).toBe(true);
    expect(await db.query.mediaAssets.findFirst({ where: eq(mediaAssets.id, firstAssetId) })).toBeUndefined();

    expect((await adminApp.request(`/api/admin/scenarios/${scenarioId}`, { method: "DELETE" })).status).toBe(204);
    expect(deletedKeys.some((key) => key.includes(secondAssetId))).toBe(true);
    expect(await db.query.mediaAssets.findFirst({ where: eq(mediaAssets.id, secondAssetId) })).toBeUndefined();
  });
});
