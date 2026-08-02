/**
 * Configuration for S3-compatible storage
 */
export interface StorageConfig {
  /** S3 endpoint URL (e.g., MinIO locally or a Cloudflare R2 S3 endpoint) */
  endpoint: string;
  /** AWS region */
  region: string;
  /** S3 bucket name */
  bucket: string;
  /** Access key ID */
  accessKey: string;
  /** Secret access key */
  secretKey: string;
  /** Force path-style URLs (required for MinIO) */
  forcePathStyle: boolean;
}

export interface StorageUploadOptions {
  /** MIME type stored with the object. */
  contentType?: string;
  /** Private object metadata. Keys and values must be safe S3 metadata strings. */
  metadata?: Record<string, string>;
}

export interface PrivateMediaUpload {
  key: string;
  buffer: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface StoredPrivateMedia {
  objectKey: string;
  contentType: string;
  byteSize: number;
  checksumSha256: string;
}

/**
 * Storage provider abstraction for S3-compatible storage
 * Supports MinIO (local development) and Cloudflare R2 (shared practice data)
 */
export interface StorageProvider {
  /**
   * Upload a file to storage
   * @param key - Unique key/path for the file (e.g., "sessions/123/audio.wav")
   * @param buffer - File content as Buffer
   * @param options - Content type and private object metadata
   */
  upload(key: string, buffer: Buffer, options?: StorageUploadOptions): Promise<void>;

  /**
   * Download a file from storage
   * @param key - Unique key/path for the file
   * @returns File content as Buffer
   */
  download(key: string): Promise<Buffer>;

  /**
   * Generate a signed URL for temporary access
   * @param key - Unique key/path for the file
   * @param expiresIn - Expiration time in seconds (default: 3600)
   * @returns Pre-signed URL
   */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Delete a file from storage
   * @param key - Unique key/path for the file
   */
  delete(key: string): Promise<void>;

  /**
   * Check if a file exists
   * @param key - Unique key/path for the file
   */
  exists(key: string): Promise<boolean>;

  /**
   * List files with a given prefix
   * @param prefix - Key prefix (e.g., "sessions/123/")
   * @returns Array of file keys
   */
  list(prefix: string): Promise<string[]>;
}
