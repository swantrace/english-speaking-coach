ALTER TABLE `scenarios` ADD `source` text NOT NULL DEFAULT 'admin';--> statement-breakpoint
ALTER TABLE `scenarios` ADD `review_status` text NOT NULL DEFAULT 'approved';--> statement-breakpoint
ALTER TABLE `scenarios` ADD `reviewed_at` text;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `reviewed_by_user_id` text;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `submission_id` text;--> statement-breakpoint
CREATE INDEX `scenarios_source_idx` ON `scenarios` (`source`);--> statement-breakpoint
CREATE INDEX `scenarios_review_status_idx` ON `scenarios` (`review_status`);--> statement-breakpoint
CREATE INDEX `scenarios_submission_id_idx` ON `scenarios` (`submission_id`);