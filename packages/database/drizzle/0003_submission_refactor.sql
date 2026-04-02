CREATE TABLE `submissions` (
	`created_at` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`total_count` integer NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `submissions_kind_check` CHECK(`kind` in ('scenario.generate'))
);
--> statement-breakpoint
CREATE INDEX `submissions_kind_idx` ON `submissions` (`kind`);--> statement-breakpoint
INSERT INTO `submissions` (`id`, `kind`, `created_at`, `updated_at`, `total_count`)
SELECT
	`submission_id`,
	'scenario.generate',
	MIN(`queued_at`),
	MAX(COALESCE(`processed_at`, `queued_at`)),
	COUNT(*)
FROM `scenario_generate_job_snapshots`
GROUP BY `submission_id`;
--> statement-breakpoint
CREATE TABLE `submission_jobs` (
	`cursor` integer NOT NULL,
	`error` text,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` text NOT NULL,
	`message` text NOT NULL,
	`processed_at` text,
	`progress` integer NOT NULL,
	`queued_at` text NOT NULL,
	`status` text NOT NULL,
	`submission_id` text NOT NULL,
	CONSTRAINT `submission_jobs_status_check` CHECK(`status` in ('queued', 'started', 'completed', 'failed')),
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `submission_jobs` (
	`cursor`,
	`error`,
	`job_id`,
	`message`,
	`processed_at`,
	`progress`,
	`queued_at`,
	`status`,
	`submission_id`
)
SELECT
	`cursor`,
	`error`,
	`job_id`,
	`message`,
	`processed_at`,
	`progress`,
	`queued_at`,
	`status`,
	`submission_id`
FROM `scenario_generate_job_snapshots`;
--> statement-breakpoint
CREATE UNIQUE INDEX `submission_jobs_submission_cursor_idx` ON `submission_jobs` (`submission_id`,`cursor`);--> statement-breakpoint
CREATE UNIQUE INDEX `submission_jobs_job_id_idx` ON `submission_jobs` (`job_id`);--> statement-breakpoint
CREATE INDEX `submission_jobs_submission_idx` ON `submission_jobs` (`submission_id`);--> statement-breakpoint
DROP TABLE `scenario_generate_job_snapshots`;--> statement-breakpoint
DROP TABLE `job_runs`;