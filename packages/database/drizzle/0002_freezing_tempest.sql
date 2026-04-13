ALTER TABLE `scenarios` ADD `tags` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `image_url` text;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `deleted_at` text;--> statement-breakpoint
CREATE INDEX `scenarios_deleted_at_idx` ON `scenarios` (`deleted_at`);