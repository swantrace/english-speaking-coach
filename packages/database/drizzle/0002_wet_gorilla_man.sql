CREATE TABLE `session_processing` (
	`session_history_id` text PRIMARY KEY NOT NULL,
	`analysis_status` text NOT NULL,
	`analysis_error` text,
	`rewritten_transcript_status` text NOT NULL,
	`rewritten_transcript_error` text,
	`dialogue_audio_status` text NOT NULL,
	`dialogue_audio_error` text,
	`knowledge_status` text NOT NULL,
	`knowledge_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`session_history_id`) REFERENCES `session_history`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "session_processing_analysis_status_check" CHECK("session_processing"."analysis_status" in ('not_applicable', 'queued', 'processing', 'ready', 'failed')),
	CONSTRAINT "session_processing_rewritten_transcript_status_check" CHECK("session_processing"."rewritten_transcript_status" in ('not_applicable', 'queued', 'processing', 'ready', 'failed')),
	CONSTRAINT "session_processing_dialogue_audio_status_check" CHECK("session_processing"."dialogue_audio_status" in ('not_applicable', 'queued', 'processing', 'ready', 'failed')),
	CONSTRAINT "session_processing_knowledge_status_check" CHECK("session_processing"."knowledge_status" in ('not_applicable', 'queued', 'processing', 'ready', 'failed'))
);
--> statement-breakpoint
CREATE INDEX `session_processing_analysis_status_idx` ON `session_processing` (`analysis_status`);--> statement-breakpoint
CREATE INDEX `session_processing_rewritten_transcript_status_idx` ON `session_processing` (`rewritten_transcript_status`);--> statement-breakpoint
CREATE INDEX `session_processing_dialogue_audio_status_idx` ON `session_processing` (`dialogue_audio_status`);--> statement-breakpoint
CREATE INDEX `session_processing_knowledge_status_idx` ON `session_processing` (`knowledge_status`);