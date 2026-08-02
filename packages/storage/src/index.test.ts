import { afterEach, describe, expect, test, vi } from "vitest";
import { getStorageConfig } from "./config";
import { calculateSha256, createPrivateMediaObjectKey, uploadPrivateMedia } from "./private-media";
import type { StorageProvider } from "./types";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("private media", () => {
  test("creates a user-scoped object key from an allow-listed content type", () => {
    expect(
      createPrivateMediaObjectKey({
        assetId: "asset-123",
        contentType: "audio/mpeg",
        kind: "corrected_dialogue",
        userId: "user_456",
      }),
    ).toBe("private/users/user_456/corrected_dialogue/asset-123.mp3");
  });

  test("rejects unsafe key segments and unsupported content types", () => {
    expect(() =>
      createPrivateMediaObjectKey({
        assetId: "../asset",
        contentType: "image/png",
        kind: "scenario_image",
        userId: "user-1",
      }),
    ).toThrow("assetId");
    expect(() =>
      createPrivateMediaObjectKey({
        assetId: "asset-1",
        contentType: "text/html",
        kind: "scenario_image",
        userId: "user-1",
      }),
    ).toThrow("Unsupported private media content type");
  });

  test("uploads checksum metadata and returns persistable metadata", async () => {
    const upload = vi.fn().mockResolvedValue(undefined);
    const storage = { upload } as unknown as StorageProvider;
    const buffer = Buffer.from("private media");
    const checksumSha256 = calculateSha256(buffer);

    await expect(
      uploadPrivateMedia(storage, {
        buffer,
        contentType: "audio/mpeg",
        key: "private/users/user-1/corrected_dialogue/asset-1.mp3",
        metadata: { assetId: "asset-1" },
      }),
    ).resolves.toEqual({
      byteSize: buffer.byteLength,
      checksumSha256,
      contentType: "audio/mpeg",
      objectKey: "private/users/user-1/corrected_dialogue/asset-1.mp3",
    });
    expect(upload).toHaveBeenCalledWith("private/users/user-1/corrected_dialogue/asset-1.mp3", buffer, {
      contentType: "audio/mpeg",
      metadata: { assetId: "asset-1", checksumSha256 },
    });
  });
});

describe("getStorageConfig", () => {
  test("uses Cloudflare R2 defaults", () => {
    process.env.S3_PROVIDER = "r2";
    process.env.S3_ENDPOINT = "https://account-id.r2.cloudflarestorage.com";
    process.env.S3_BUCKET = "english-coach-practice";
    process.env.S3_ACCESS_KEY = "access-key";
    process.env.S3_SECRET_KEY = "secret-key";
    delete process.env.S3_REGION;
    delete process.env.S3_FORCE_PATH_STYLE;

    expect(getStorageConfig()).toEqual({
      accessKey: "access-key",
      bucket: "english-coach-practice",
      endpoint: "https://account-id.r2.cloudflarestorage.com",
      forcePathStyle: false,
      region: "auto",
      secretKey: "secret-key",
    });
  });

  test("keeps MinIO path-style configuration", () => {
    process.env.S3_PROVIDER = "minio";
    process.env.S3_ENDPOINT = "http://localhost:9000";
    process.env.S3_REGION = "us-east-1";
    process.env.S3_BUCKET = "english-coach-development";
    process.env.S3_ACCESS_KEY = "minioadmin";
    process.env.S3_SECRET_KEY = "minioadmin";
    process.env.S3_FORCE_PATH_STYLE = "true";

    expect(getStorageConfig().forcePathStyle).toBe(true);
  });
});
