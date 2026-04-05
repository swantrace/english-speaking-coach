ALTER TABLE `knowledge_items` ADD `review_status` text NOT NULL DEFAULT 'approved';--> statement-breakpoint
ALTER TABLE `knowledge_items` ADD `reviewed_at` text;--> statement-breakpoint
ALTER TABLE `knowledge_items` ADD `reviewed_by_user_id` text;--> statement-breakpoint
ALTER TABLE `knowledge_items` ADD `submission_id` text;--> statement-breakpoint
CREATE INDEX `knowledge_items_source_idx` ON `knowledge_items` (`source`);--> statement-breakpoint
CREATE INDEX `knowledge_items_review_status_idx` ON `knowledge_items` (`review_status`);--> statement-breakpoint
CREATE INDEX `knowledge_items_submission_id_idx` ON `knowledge_items` (`submission_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_submissions` (
	`created_at` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`total_count` integer NOT NULL,
	`updated_at` text NOT NULL,
	`user_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT `submissions_kind_check` CHECK("__new_submissions".`kind` in ('scenario.generate', 'knowledge.generate'))
);--> statement-breakpoint
INSERT INTO `__new_submissions` (`created_at`, `id`, `kind`, `total_count`, `updated_at`, `user_id`)
SELECT `created_at`, `id`, `kind`, `total_count`, `updated_at`, `user_id` FROM `submissions`;--> statement-breakpoint
DROP TABLE `submissions`;--> statement-breakpoint
ALTER TABLE `__new_submissions` RENAME TO `submissions`;--> statement-breakpoint
CREATE INDEX `submissions_kind_idx` ON `submissions` (`kind`);--> statement-breakpoint
PRAGMA foreign_keys=ON;