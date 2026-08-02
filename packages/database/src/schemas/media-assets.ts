import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const mediaAssetKindValues = [
  "scenario_image",
  "corrected_dialogue",
  "corrected_dialogue_turn",
  "free_form_attachment",
] as const;

export const mediaAssetStatusValues = ["pending", "ready", "failed", "deleting"] as const;

export type MediaAssetKind = (typeof mediaAssetKindValues)[number];
export type MediaAssetStatus = (typeof mediaAssetStatusValues)[number];

const mediaAssetKindValuesSql = sql.raw(
  mediaAssetKindValues.map((value) => `'${value.replace(/'/g, "''")}'`).join(", "),
);
const mediaAssetStatusValuesSql = sql.raw(
  mediaAssetStatusValues.map((value) => `'${value.replace(/'/g, "''")}'`).join(", "),
);

export const mediaAssets = sqliteTable(
  "media_assets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: mediaAssetKindValues }).notNull(),
    status: text("status", { enum: mediaAssetStatusValues }).notNull().default("pending"),
    bucket: text("bucket").notNull(),
    objectKey: text("object_key").notNull(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    durationMs: integer("duration_ms"),
    checksumSha256: text("checksum_sha256").notNull(),
    originalFilename: text("original_filename"),
    error: text("error"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    uniqueIndex("media_assets_bucket_object_key_idx").on(table.bucket, table.objectKey),
    index("media_assets_user_id_idx").on(table.userId),
    index("media_assets_user_kind_idx").on(table.userId, table.kind),
    index("media_assets_status_idx").on(table.status),
    index("media_assets_deleted_at_idx").on(table.deletedAt),
    check("media_assets_kind_check", sql`${table.kind} in (${mediaAssetKindValuesSql})`),
    check("media_assets_status_check", sql`${table.status} in (${mediaAssetStatusValuesSql})`),
    check("media_assets_byte_size_check", sql`${table.byteSize} >= 0`),
    check("media_assets_duration_ms_check", sql`${table.durationMs} is null or ${table.durationMs} >= 0`),
    check("media_assets_checksum_sha256_check", sql`length(${table.checksumSha256}) = 64`),
  ],
);
