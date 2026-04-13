CREATE INDEX `submission_jobs_session_history_idx` ON `submission_jobs` (`session_history_id`);--> statement-breakpoint
CREATE INDEX `submission_jobs_scenario_idx` ON `submission_jobs` (`scenario_id`);--> statement-breakpoint
CREATE INDEX `submission_jobs_knowledge_item_idx` ON `submission_jobs` (`knowledge_item_id`);