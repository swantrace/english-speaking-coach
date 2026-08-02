CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`bucket` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`duration_ms` integer,
	`checksum_sha256` text NOT NULL,
	`original_filename` text,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "media_assets_kind_check" CHECK("media_assets"."kind" in ('scenario_image', 'corrected_dialogue', 'corrected_dialogue_turn', 'free_form_attachment')),
	CONSTRAINT "media_assets_status_check" CHECK("media_assets"."status" in ('pending', 'ready', 'failed', 'deleting')),
	CONSTRAINT "media_assets_byte_size_check" CHECK("media_assets"."byte_size" >= 0),
	CONSTRAINT "media_assets_duration_ms_check" CHECK("media_assets"."duration_ms" is null or "media_assets"."duration_ms" >= 0),
	CONSTRAINT "media_assets_checksum_sha256_check" CHECK(length("media_assets"."checksum_sha256") = 64)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_assets_bucket_object_key_idx` ON `media_assets` (`bucket`,`object_key`);--> statement-breakpoint
CREATE INDEX `media_assets_user_id_idx` ON `media_assets` (`user_id`);--> statement-breakpoint
CREATE INDEX `media_assets_user_kind_idx` ON `media_assets` (`user_id`,`kind`);--> statement-breakpoint
CREATE INDEX `media_assets_status_idx` ON `media_assets` (`status`);--> statement-breakpoint
CREATE INDEX `media_assets_deleted_at_idx` ON `media_assets` (`deleted_at`);