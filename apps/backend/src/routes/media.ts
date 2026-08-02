import { mediaAccessResponseSchema } from "@english-coach/contract/media";
import { db } from "@english-coach/database";
import { mediaAssets, scenarios } from "@english-coach/database/schema";
import { getStorageConfig, getStorageProvider } from "@english-coach/storage";
import { and, eq, isNull } from "drizzle-orm";
import type { BackendApp } from "../http/context";
import { getAuthenticatedUser } from "../http/context";

const MEDIA_URL_TTL_SECONDS = 300;

export interface MediaAccessSigner {
  bucket: string;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
}

export interface MediaRouteDependencies {
  getMediaAccessSigner(): MediaAccessSigner;
}

const defaultDependencies: MediaRouteDependencies = {
  getMediaAccessSigner() {
    const config = getStorageConfig();
    const storage = getStorageProvider();
    return {
      bucket: config.bucket,
      getSignedUrl: (key, expiresIn) => storage.getSignedUrl(key, expiresIn),
    };
  },
};

export function registerMediaRoutes(app: BackendApp, dependencies: MediaRouteDependencies = defaultDependencies) {
  app.get("/api/media/:assetId/access", async (context) => {
    const currentUser = getAuthenticatedUser(context);
    if (!currentUser) {
      return context.json({ error: "Authentication required" }, 401);
    }

    const asset = await db.query.mediaAssets.findFirst({
      where: and(
        eq(mediaAssets.id, context.req.param("assetId")),
        eq(mediaAssets.status, "ready"),
        isNull(mediaAssets.deletedAt),
      ),
    });

    if (!asset) {
      return context.json({ error: "Media asset not found" }, 404);
    }

    const isOwnerOrAdmin = currentUser.role === "admin" || asset.userId === currentUser.id;
    const visibleScenario =
      asset.kind === "scenario_image"
        ? await db.query.scenarios.findFirst({
            columns: { id: true },
            where: and(
              eq(scenarios.imageAssetId, asset.id),
              eq(scenarios.isPendingReview, false),
              isNull(scenarios.deletedAt),
            ),
          })
        : null;

    if (!isOwnerOrAdmin && !visibleScenario) {
      return context.json({ error: "Media asset not found" }, 404);
    }

    try {
      const signer = dependencies.getMediaAccessSigner();
      if (asset.bucket !== signer.bucket) {
        return context.json({ error: "Media storage is unavailable" }, 503);
      }

      const url = await signer.getSignedUrl(asset.objectKey, MEDIA_URL_TTL_SECONDS);
      return context.json(
        mediaAccessResponseSchema.parse({
          contentType: asset.contentType,
          expiresAt: new Date(Date.now() + MEDIA_URL_TTL_SECONDS * 1_000).toISOString(),
          url,
        }),
      );
    } catch (error) {
      console.error("Failed to create private media access URL", {
        assetId: asset.id,
        error,
      });
      return context.json({ error: "Media storage is unavailable" }, 503);
    }
  });
}
