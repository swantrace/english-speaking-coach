PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_scenarios` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`setting` text NOT NULL,
	`characters` text NOT NULL,
	`goals` text NOT NULL,
	`example_dialogue` text NOT NULL,
	`is_pending_review` integer NOT NULL DEFAULT 0,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `scenarios_is_pending_review_check` CHECK("__new_scenarios".`is_pending_review` in (0, 1))
);--> statement-breakpoint
INSERT INTO `__new_scenarios` (
	`id`,
	`title`,
	`setting`,
	`characters`,
	`goals`,
	`example_dialogue`,
	`is_pending_review`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	`title`,
	`setting`,
	`characters`,
	`goals`,
	`example_dialogue`,
	CASE WHEN coalesce(`review_status`, 'approved') = 'pending_review' THEN 1 ELSE 0 END,
	`created_at`,
	`updated_at`
FROM `scenarios`;--> statement-breakpoint
DROP TABLE `scenarios`;--> statement-breakpoint
ALTER TABLE `__new_scenarios` RENAME TO `scenarios`;--> statement-breakpoint
CREATE INDEX `scenarios_is_pending_review_idx` ON `scenarios` (`is_pending_review`);--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
