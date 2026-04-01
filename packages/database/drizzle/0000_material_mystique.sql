CREATE TABLE `job_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` text NOT NULL,
	`message` text NOT NULL,
	`processed_at` text NOT NULL
);
