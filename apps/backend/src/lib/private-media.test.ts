import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db, migrateDatabase } from "@english-coach/database";
import { mediaAssets, user } from "@english-coach/database/schema";
import type { StorageProvider } from "@english-coach/storage";
import { eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import type { AppVariables } from "../http/context";
import { registerMediaRoutes } from "../routes/media";
import { cleanupPrivateMediaAsset } from "./private-media-cleanup";

const runId = crypto.randomUUID();
const ownerId = `media-owner-${runId}`;
const otherId = `media-other-${runId}`;
const assetId = `media-access-${runId}`;
const cleanupAssetId = `media-cleanup-${runId}`;
const failedCleanupAssetId = `media-cleanup-failed-${runId}`;
const assetIds = [assetId, cleanupAssetId, failedCleanupAssetId];

function createApp(authenticatedUserId: string | null, role: "admin" | "student" = "student") {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use("*", async (context, next) => {
    context.set("session", null);
    context.set(
      "user",
      authenticatedUserId
        ? ({
            email: `${authenticatedUserId}@example.com`,
            id: authenticatedUserId,
            name: "Media test user",
            role,
          } as never)
        : null,
    );
    await next();
  });
  registerMediaRoutes(app, {
    getMediaAccessSigner: () => ({
      bucket: "private-media-test",
      getSignedUrl: async (key, expiresIn) =>
        `https://media.example.com/${encodeURIComponent(key)}?expires=${expiresIn}`,
    }),
  });
  return app;
}

function createStorage(deleteObject: (key: string) => Promise<void>): StorageProvider {
  return {
    delete: deleteObject,
    download: async () => Buffer.alloc(0),
    exists: async () => true,
    getSignedUrl: async () => "https://media.example.com/signed",
    list: async () => [],
    upload: async () => undefined,
  };
}

describe("private media authorization and cleanup", () => {
  beforeAll(async () => {
    await migrateDatabase();
    await db.insert(user).values([
      {
        email: `${ownerId}@example.com`,
        id: ownerId,
        name: "Media owner",
        role: "student",
        status: "approved",
      },
      {
        email: `${otherId}@example.com`,
        id: otherId,
        name: "Other learner",
        role: "student",
        status: "approved",
      },
    ]);

    const now = new Date().toISOString();
    await db.insert(mediaAssets).values(
      assetIds.map((id) => ({
        bucket: "private-media-test",
        byteSize: 100,
        checksumSha256: "a".repeat(64),
        contentType: "audio/mpeg",
        createdAt: now,
        id,
        kind: "corrected_dialogue" as const,
        objectKey: `private/users/${ownerId}/corrected_dialogue/${id}.mp3`,
        status: "ready" as const,
        updatedAt: now,
        userId: ownerId,
      })),
    );
  });

  afterAll(async () => {
    await db.delete(mediaAssets).where(inArray(mediaAssets.id, assetIds));
    await db.delete(user).where(inArray(user.id, [ownerId, otherId]));
  });

  it("allows only the owner or an administrator to request a signed URL", async () => {
    const ownerResponse = await createApp(ownerId).request(`/api/media/${assetId}/access`);
    expect(ownerResponse.status).toBe(200);
    expect(await ownerResponse.json()).toMatchObject({
      contentType: "audio/mpeg",
      url: expect.stringContaining("expires=300"),
    });

    expect((await createApp(otherId).request(`/api/media/${assetId}/access`)).status).toBe(404);
    expect((await createApp(otherId, "admin").request(`/api/media/${assetId}/access`)).status).toBe(200);
    expect((await createApp(null).request(`/api/media/${assetId}/access`)).status).toBe(401);
  });

  it("removes the database record only after object cleanup succeeds", async () => {
    const deletedKeys: string[] = [];
    const storage = createStorage(async (key) => {
      deletedKeys.push(key);
    });

    expect(await cleanupPrivateMediaAsset(cleanupAssetId, storage)).toBe(true);
    expect(deletedKeys).toEqual([`private/users/${ownerId}/corrected_dialogue/${cleanupAssetId}.mp3`]);
    expect(await db.query.mediaAssets.findFirst({ where: eq(mediaAssets.id, cleanupAssetId) })).toBeUndefined();
  });

  it("retains a failed cleanup for retry with its error", async () => {
    const storage = createStorage(async () => {
      throw new Error("R2 temporarily unavailable");
    });

    await expect(cleanupPrivateMediaAsset(failedCleanupAssetId, storage)).rejects.toThrow("R2 temporarily unavailable");
    const retained = await db.query.mediaAssets.findFirst({
      where: eq(mediaAssets.id, failedCleanupAssetId),
    });
    expect(retained).toMatchObject({ error: "R2 temporarily unavailable", status: "failed" });
  });
});
