/**
 * Storage abstraction for S3-compatible object storage
 * Supports MinIO (local dev) and Tigris (production)
 *
 * @packageDocumentation
 */

export { getStorageConfig, isStorageConfigured } from "./config";
export { S3StorageProvider } from "./s3-client";
export type { StorageConfig, StorageProvider } from "./types";

import { getStorageConfig } from "./config";
import { S3StorageProvider } from "./s3-client";

/**
 * Get a configured storage provider instance
 * Uses environment variables to determine configuration
 */
export function getStorageProvider(): S3StorageProvider {
  const config = getStorageConfig();
  return new S3StorageProvider(config);
}
