import { db } from "@english-coach/database";
import { mediaAssets } from "@english-coach/database/schema";
import type { StorageProvider } from "@english-coach/storage";
import { eq } from "drizzle-orm";

export async function cleanupPrivateMediaAsset(assetId: string, storage: StorageProvider): Promise<boolean> {
  const asset = await db.query.mediaAssets.findFirst({
    where: eq(mediaAssets.id, assetId),
  });
  if (!asset) {
    return false;
  }

  const now = new Date().toISOString();
  await db
    .update(mediaAssets)
    .set({ error: null, status: "deleting", updatedAt: now })
    .where(eq(mediaAssets.id, asset.id));

  try {
    await storage.delete(asset.objectKey);
    await db.delete(mediaAssets).where(eq(mediaAssets.id, asset.id));
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown storage cleanup error";
    await db
      .update(mediaAssets)
      .set({ error: message, status: "failed", updatedAt: new Date().toISOString() })
      .where(eq(mediaAssets.id, asset.id));
    throw error;
  }
}
