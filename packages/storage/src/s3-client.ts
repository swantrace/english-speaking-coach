import {
  S3Client as AWSS3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageConfig, StorageProvider, StorageUploadOptions } from "./types";

/**
 * S3-compatible storage implementation
 * Works with MinIO (local development) and Cloudflare R2 (shared practice data).
 */
export class S3StorageProvider implements StorageProvider {
  private client: AWSS3Client;
  private bucket: string;

  constructor(config: StorageConfig) {
    this.bucket = config.bucket;
    this.client = new AWSS3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      forcePathStyle: config.forcePathStyle,
    });
  }

  async upload(key: string, buffer: Buffer, options: StorageUploadOptions = {}): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentLength: buffer.byteLength,
      ContentType: options.contentType ?? "application/octet-stream",
      Metadata: options.metadata,
    });

    await this.client.send(command);
  }

  async download(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);

    if (!response.Body) {
      throw new Error(`File not found: ${key}`);
    }

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  async getSignedUrl(key: string, expiresIn = 300): Promise<string> {
    if (!key.startsWith("private/")) {
      throw new Error("Signed media URLs are restricted to private object keys");
    }
    if (!Number.isInteger(expiresIn) || expiresIn < 1 || expiresIn > 3600) {
      throw new Error("Signed URL expiry must be between 1 and 3600 seconds");
    }
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      // HeadObject throws NotFound error if object doesn't exist
      if (error && typeof error === "object" && "name" in error) {
        if (error.name === "NotFound") {
          return false;
        }
      }
      throw error;
    }
  }

  async list(prefix: string): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
    });

    const response = await this.client.send(command);
    return response.Contents?.map((obj) => obj.Key).filter(Boolean) as string[];
  }
}
