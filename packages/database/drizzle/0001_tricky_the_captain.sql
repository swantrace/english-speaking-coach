PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_session`("id", "expires_at", "token", "created_at", "updated_at", "ip_address", "user_agent", "user_id") SELECT "id", "expires_at", "token", "created_at", "updated_at", "ip_address", "user_agent", "user_id" FROM `session`;--> statement-breakpoint
DROP TABLE `session`;--> statement-breakpoint
ALTER TABLE `__new_session` RENAME TO `session`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text DEFAULT 'student' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_at` integer,
	`approved_by_user_id` text,
	`rejected_at` integer,
	`rejected_by_user_id` text,
	`rejection_reason` text,
	`deleted_at` integer,
	`deleted_by_user_id` text,
	`deletion_reason` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`last_login_at` integer,
	FOREIGN KEY (`approved_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`rejected_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`deleted_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "user_admin_status_check" CHECK("__new_user"."role" != 'admin' OR "__new_user"."status" = 'approved')
);
--> statement-breakpoint
INSERT INTO `__new_user`("id", "name", "email", "email_verified", "image", "role", "status", "approved_at", "approved_by_user_id", "rejected_at", "rejected_by_user_id", "rejection_reason", "deleted_at", "deleted_by_user_id", "deletion_reason", "created_at", "updated_at", "last_login_at") SELECT "id", "name", "email", "email_verified", "image", "role", CASE WHEN "role" = 'admin' THEN 'approved' ELSE "status" END, CASE WHEN "role" = 'admin' THEN COALESCE("updated_at", "created_at") ELSE NULL END, NULL, NULL, NULL, NULL, NULL, NULL, NULL, "created_at", "updated_at", NULL FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `user_approved_by_user_id_idx` ON `user` (`approved_by_user_id`);--> statement-breakpoint
CREATE INDEX `user_rejected_by_user_id_idx` ON `user` (`rejected_by_user_id`);--> statement-breakpoint
CREATE INDEX `user_deleted_by_user_id_idx` ON `user` (`deleted_by_user_id`);--> statement-breakpoint
CREATE TABLE `__new_verification` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT "verification_type_check" CHECK("__new_verification"."type" in ('email_verification', 'password_reset', 'magic_link'))
);
--> statement-breakpoint
INSERT INTO `__new_verification`("id", "type", "identifier", "value", "expires_at", "created_at", "updated_at") SELECT "id", 'email_verification', "identifier", "value", "expires_at", "created_at", "updated_at" FROM `verification`;--> statement-breakpoint
DROP TABLE `verification`;--> statement-breakpoint
ALTER TABLE `__new_verification` RENAME TO `verification`;--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE INDEX `verification_type_identifier_idx` ON `verification` (`type`,`identifier`);--> statement-breakpoint
CREATE TABLE `__new_account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "account_credential_provider_password_check" CHECK(("__new_account"."provider_id" = 'credential' AND "__new_account"."password" IS NOT NULL) OR ("__new_account"."provider_id" != 'credential' AND "__new_account"."password" IS NULL))
);
--> statement-breakpoint
INSERT INTO `__new_account`("id", "account_id", "provider_id", "user_id", "access_token", "refresh_token", "id_token", "access_token_expires_at", "refresh_token_expires_at", "scope", "password", "created_at", "updated_at") SELECT "id", "account_id", "provider_id", "user_id", "access_token", "refresh_token", "id_token", "access_token_expires_at", "refresh_token_expires_at", "scope", "password", "created_at", "updated_at" FROM `account`;--> statement-breakpoint
DROP TABLE `account`;--> statement-breakpoint
ALTER TABLE `__new_account` RENAME TO `account`;--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `account_provider_account_unique_idx` ON `account` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `account_user_provider_unique_idx` ON `account` (`user_id`,`provider_id`);