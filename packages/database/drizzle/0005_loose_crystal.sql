PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_submissions` (
	`created_at` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`total_count` integer NOT NULL,
	`updated_at` text NOT NULL,
	`user_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "submissions_kind_check" CHECK("__new_submissions"."kind" in ('scenario.generate', 'knowledge.generate'))
);
--> statement-breakpoint
INSERT INTO `__new_submissions`("created_at", "id", "kind", "total_count", "updated_at", "user_id") SELECT "created_at", "id", "kind", "total_count", "updated_at", "user_id" FROM `submissions`;--> statement-breakpoint
DROP TABLE `submissions`;--> statement-breakpoint
ALTER TABLE `__new_submissions` RENAME TO `submissions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `submissions_kind_idx` ON `submissions` (`kind`);--> statement-breakpoint
ALTER TABLE `submission_jobs` ADD `kind` text NOT NULL;--> statement-breakpoint
ALTER TABLE `submission_jobs` ADD `input` text;--> statement-breakpoint
ALTER TABLE `submission_jobs` ADD `output` text;--> statement-breakpoint
ALTER TABLE `submission_jobs` ADD `session_history_id` text REFERENCES session_history(id);--> statement-breakpoint
ALTER TABLE `submission_jobs` ADD `scenario_id` text REFERENCES scenarios(id);--> statement-breakpoint
ALTER TABLE `submission_jobs` ADD `knowledge_item_id` text REFERENCES knowledge_items(id);