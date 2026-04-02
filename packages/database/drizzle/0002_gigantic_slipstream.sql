CREATE TABLE `scenario_generate_job_snapshots` (
	`cursor` integer NOT NULL,
	`error` text,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` text NOT NULL,
	`message` text NOT NULL,
	`processed_at` text,
	`progress` integer NOT NULL,
	`queued_at` text NOT NULL,
	`status` text NOT NULL,
	`submission_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scenario_generate_job_snapshots_submission_cursor_idx` ON `scenario_generate_job_snapshots` (`submission_id`,`cursor`);--> statement-breakpoint
CREATE UNIQUE INDEX `scenario_generate_job_snapshots_job_id_idx` ON `scenario_generate_job_snapshots` (`job_id`);--> statement-breakpoint
CREATE INDEX `scenario_generate_job_snapshots_submission_idx` ON `scenario_generate_job_snapshots` (`submission_id`);