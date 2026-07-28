import { afterEach, describe, expect, test } from "vitest";
import { getStorageConfig } from "./config";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
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
