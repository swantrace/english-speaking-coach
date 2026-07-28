import type { StorageConfig } from "./types";

/**
 * Load storage configuration from environment variables
 * Supports both MinIO (local development) and Cloudflare R2 (shared practice data).
 */
export function getStorageConfig(): StorageConfig {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION ?? (process.env.S3_PROVIDER === "r2" ? "auto" : undefined);
  const bucket = process.env.S3_BUCKET;
  const accessKey = process.env.S3_ACCESS_KEY;
  const secretKey = process.env.S3_SECRET_KEY;
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

  if (!endpoint || !region || !bucket || !accessKey || !secretKey) {
    throw new Error(
      "Missing required S3 environment variables. Required: S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY",
    );
  }

  return {
    endpoint,
    region,
    bucket,
    accessKey,
    secretKey,
    forcePathStyle,
  };
}

/**
 * Validate that storage is properly configured
 */
export function isStorageConfigured(): boolean {
  try {
    getStorageConfig();
    return true;
  } catch {
    return false;
  }
}
