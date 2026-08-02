import { createHash } from "node:crypto";
import type { PrivateMediaUpload, StorageProvider, StoredPrivateMedia } from "./types";

const SAFE_KEY_SEGMENT = /^[a-zA-Z0-9_-]+$/;
const CONTENT_TYPE_EXTENSIONS: Readonly<Record<string, string>> = {
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type PrivateMediaKind =
  | "scenario_image"
  | "corrected_dialogue"
  | "corrected_dialogue_turn"
  | "free_form_attachment";

export interface PrivateMediaObjectKeyInput {
  userId: string;
  assetId: string;
  kind: PrivateMediaKind;
  contentType: string;
}

function assertSafeKeySegment(name: string, value: string): void {
  if (!SAFE_KEY_SEGMENT.test(value)) {
    throw new Error(`${name} must contain only letters, numbers, underscores, or hyphens`);
  }
}

export function createPrivateMediaObjectKey(input: PrivateMediaObjectKeyInput): string {
  assertSafeKeySegment("userId", input.userId);
  assertSafeKeySegment("assetId", input.assetId);

  const extension = CONTENT_TYPE_EXTENSIONS[input.contentType.toLowerCase()];
  if (!extension) {
    throw new Error(`Unsupported private media content type: ${input.contentType}`);
  }

  return `private/users/${input.userId}/${input.kind}/${input.assetId}.${extension}`;
}

export function calculateSha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function uploadPrivateMedia(
  storage: StorageProvider,
  upload: PrivateMediaUpload,
): Promise<StoredPrivateMedia> {
  if (!upload.key.startsWith("private/")) {
    throw new Error("Private media object keys must start with private/");
  }
  if (upload.buffer.byteLength === 0) {
    throw new Error("Private media uploads cannot be empty");
  }

  const checksumSha256 = calculateSha256(upload.buffer);
  await storage.upload(upload.key, upload.buffer, {
    contentType: upload.contentType,
    metadata: {
      ...upload.metadata,
      checksumSha256,
    },
  });

  return {
    objectKey: upload.key,
    contentType: upload.contentType,
    byteSize: upload.buffer.byteLength,
    checksumSha256,
  };
}
