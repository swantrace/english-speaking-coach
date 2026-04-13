import { sql } from "drizzle-orm";
import { type AnySQLiteColumn, check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const userRoleValues = ["student", "admin"] as const;
export const userStatusValues = ["pending", "approved", "rejected", "deleted"] as const;
export const verificationTypeValues = ["email_verification", "password_reset", "magic_link"] as const;

export const user = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
    image: text("image"),
    role: text("role", { enum: userRoleValues }).notNull().default("student"),
    status: text("status", { enum: userStatusValues }).notNull().default("pending"),
    approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
    approvedByUserId: text("approved_by_user_id").references((): AnySQLiteColumn => user.id, {
      onDelete: "set null",
    }),
    rejectedAt: integer("rejected_at", { mode: "timestamp_ms" }),
    rejectedByUserId: text("rejected_by_user_id").references((): AnySQLiteColumn => user.id, {
      onDelete: "set null",
    }),
    rejectionReason: text("rejection_reason"),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    deletedByUserId: text("deleted_by_user_id").references((): AnySQLiteColumn => user.id, {
      onDelete: "set null",
    }),
    deletionReason: text("deletion_reason"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("user_approved_by_user_id_idx").on(table.approvedByUserId),
    index("user_rejected_by_user_id_idx").on(table.rejectedByUserId),
    index("user_deleted_by_user_id_idx").on(table.deletedByUserId),
    check("user_admin_status_check", sql`${table.role} != 'admin' OR ${table.status} = 'approved'`),
  ],
);

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("account_userId_idx").on(table.userId),
    uniqueIndex("account_provider_account_unique_idx").on(table.providerId, table.accountId),
    uniqueIndex("account_user_provider_unique_idx").on(table.userId, table.providerId),
    check(
      "account_credential_provider_password_check",
      sql`(${table.providerId} = 'credential' AND ${table.password} IS NOT NULL) OR (${table.providerId} != 'credential' AND ${table.password} IS NULL)`,
    ),
  ],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    type: text("type", { enum: verificationTypeValues }).notNull(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("verification_identifier_idx").on(table.identifier),
    index("verification_type_identifier_idx").on(table.type, table.identifier),
    check("verification_type_check", sql`${table.type} in ('email_verification', 'password_reset', 'magic_link')`),
  ],
);
