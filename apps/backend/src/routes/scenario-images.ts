import { scenarioImageUploadResponseSchema } from "@english-coach/contract/scenario";
import { db } from "@english-coach/database";
import { mediaAssets, scenarios } from "@english-coach/database/schema";
import type { StorageProvider } from "@english-coach/storage";
import {
  createPrivateMediaObjectKey,
  getStorageConfig,
  getStorageProvider,
  uploadPrivateMedia,
} from "@english-coach/storage";
import { eq } from "drizzle-orm";
import { bodyLimit } from "hono/body-limit";
import type { BackendApp } from "../http/context";
import { getAuthenticatedUser } from "../http/context";
import { cleanupPrivateMediaAsset } from "../lib/private-media-cleanup";

const MAX_SCENARIO_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(["image/avif", "image/jpeg", "image/png", "image/webp"]);

export interface ScenarioImageStorage {
  bucket: string;
  provider: StorageProvider;
}

export interface ScenarioImageRouteDependencies {
  getStorage(): ScenarioImageStorage;
}

const defaultDependencies: ScenarioImageRouteDependencies = {
  getStorage() {
    return {
      bucket: getStorageConfig().bucket,
      provider: getStorageProvider(),
    };
  },
};

export function registerScenarioImageRoutes(
  app: BackendApp,
  dependencies: ScenarioImageRouteDependencies = defaultDependencies,
) {
  app.post(
    "/api/admin/scenarios/:scenarioId/image",
    bodyLimit({
      maxSize: MAX_SCENARIO_IMAGE_BYTES + 1024 * 1024,
      onError: (context) => context.json({ error: "Scenario image is too large" }, 413),
    }),
    async (context) => {
      const currentUser = getAuthenticatedUser(context);
      if (!currentUser || currentUser.role !== "admin") {
        return context.json({ error: "Forbidden" }, 403);
      }

      const scenario = await db.query.scenarios.findFirst({
        where: eq(scenarios.id, context.req.param("scenarioId")),
      });
      if (!scenario || scenario.deletedAt) {
        return context.json({ error: "Scenario not found" }, 404);
      }

      const body = await context.req.parseBody();
      const file = body.file;
      if (!(file instanceof File)) {
        return context.json({ error: "Scenario image file is required" }, 400);
      }
      if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
        return context.json({ error: "Unsupported scenario image type" }, 415);
      }
      if (file.size === 0 || file.size > MAX_SCENARIO_IMAGE_BYTES) {
        return context.json({ error: "Scenario image must be between 1 byte and 5 MiB" }, 413);
      }

      const assetId = crypto.randomUUID();
      const objectKey = createPrivateMediaObjectKey({
        assetId,
        contentType: file.type,
        kind: "scenario_image",
        userId: currentUser.id,
      });
      const buffer = Buffer.from(await file.arrayBuffer());
      const now = new Date().toISOString();
      let uploadedStorage: ScenarioImageStorage | undefined;

      try {
        const storage = dependencies.getStorage();
        const metadata = await uploadPrivateMedia(storage.provider, {
          buffer,
          contentType: file.type,
          key: objectKey,
          metadata: { assetid: assetId, scenarioid: scenario.id, userid: currentUser.id },
        });
        uploadedStorage = storage;

        await db.transaction(async (transaction) => {
          await transaction.insert(mediaAssets).values({
            bucket: storage.bucket,
            byteSize: metadata.byteSize,
            checksumSha256: metadata.checksumSha256,
            contentType: metadata.contentType,
            createdAt: now,
            id: assetId,
            kind: "scenario_image",
            objectKey: metadata.objectKey,
            originalFilename: file.name || null,
            status: "ready",
            updatedAt: now,
            userId: currentUser.id,
          });
          await transaction
            .update(scenarios)
            .set({ imageAssetId: assetId, updatedAt: now })
            .where(eq(scenarios.id, scenario.id));
        });

        if (scenario.imageAssetId) {
          cleanupPrivateMediaAsset(scenario.imageAssetId, storage.provider).catch((error) => {
            console.error("Failed to clean up replaced scenario image", {
              assetId: scenario.imageAssetId,
              error,
              scenarioId: scenario.id,
            });
          });
        }

        return context.json(
          scenarioImageUploadResponseSchema.parse({
            assetId,
            contentType: file.type,
          }),
          201,
        );
      } catch (error) {
        if (uploadedStorage) {
          await uploadedStorage.provider.delete(objectKey).catch((cleanupError) => {
            console.error("Failed to clean up an uncommitted scenario image", {
              assetId,
              cleanupError,
              scenarioId: scenario.id,
            });
          });
        }
        console.error("Failed to upload scenario image", { error, scenarioId: scenario.id });
        return context.json({ error: "Scenario image storage is unavailable" }, 503);
      }
    },
  );

  app.delete("/api/admin/scenarios/:scenarioId/image", async (context) => {
    const currentUser = getAuthenticatedUser(context);
    if (!currentUser || currentUser.role !== "admin") {
      return context.json({ error: "Forbidden" }, 403);
    }

    const scenario = await db.query.scenarios.findFirst({
      where: eq(scenarios.id, context.req.param("scenarioId")),
    });
    if (!scenario || scenario.deletedAt) {
      return context.json({ error: "Scenario not found" }, 404);
    }
    if (!scenario.imageAssetId) {
      return context.body(null, 204);
    }

    await db
      .update(scenarios)
      .set({ imageAssetId: null, updatedAt: new Date().toISOString() })
      .where(eq(scenarios.id, scenario.id));

    try {
      await cleanupPrivateMediaAsset(scenario.imageAssetId, dependencies.getStorage().provider);
      return context.body(null, 204);
    } catch (error) {
      console.error("Failed to delete scenario image", { error, scenarioId: scenario.id });
      return context.json({ error: "Scenario image cleanup is pending" }, 503);
    }
  });
}
