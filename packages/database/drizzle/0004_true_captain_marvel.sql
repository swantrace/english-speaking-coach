PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_submissions` (
	`created_at` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`input` text,
	`output` text,
	`session_history_id` text,
	`scenario_id` text,
	`knowledge_item_id` text,
	`total_count` integer NOT NULL,
	`updated_at` text NOT NULL,
	`user_id` text,
	FOREIGN KEY (`session_history_id`) REFERENCES `session_history`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`scenario_id`) REFERENCES `scenarios`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`knowledge_item_id`) REFERENCES `knowledge_items`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_submissions`("created_at", "id", "kind", "input", "output", "session_history_id", "scenario_id", "knowledge_item_id", "total_count", "updated_at", "user_id") SELECT "created_at", "id", "kind", "input", "output", "session_history_id", "scenario_id", "knowledge_item_id", "total_count", "updated_at", "user_id" FROM `submissions`;--> statement-breakpoint
DROP TABLE `submissions`;--> statement-breakpoint
ALTER TABLE `__new_submissions` RENAME TO `submissions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `submissions_kind_idx` ON `submissions` (`kind`);