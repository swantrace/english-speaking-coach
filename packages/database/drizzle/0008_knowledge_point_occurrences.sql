CREATE TABLE `session_knowledge_point_occurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`session_history_id` text NOT NULL,
	`knowledge_item_id` text NOT NULL,
	`speaker` text NOT NULL,
	`transcript_turn_index` integer NOT NULL,
	`excerpt` text NOT NULL,
	`occurrence_count` integer NOT NULL DEFAULT 1,
	FOREIGN KEY (`session_history_id`) REFERENCES `session_history`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`knowledge_item_id`) REFERENCES `knowledge_items`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT `session_knowledge_point_occurrences_occurrence_count_check` CHECK("session_knowledge_point_occurrences".`occurrence_count` >= 1),
	CONSTRAINT `session_knowledge_point_occurrences_speaker_check` CHECK("session_knowledge_point_occurrences".`speaker` in ('user', 'agent')),
	CONSTRAINT `session_knowledge_point_occurrences_turn_index_check` CHECK("session_knowledge_point_occurrences".`transcript_turn_index` >= 0)
);--> statement-breakpoint
CREATE INDEX `session_knowledge_point_occurrences_session_history_idx` ON `session_knowledge_point_occurrences` (`session_history_id`);--> statement-breakpoint
CREATE INDEX `session_knowledge_point_occurrences_knowledge_item_idx` ON `session_knowledge_point_occurrences` (`knowledge_item_id`);--> statement-breakpoint
CREATE INDEX `session_knowledge_point_occurrences_turn_idx` ON `session_knowledge_point_occurrences` (`session_history_id`,`transcript_turn_index`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_knowledge_point_occurrences_unique_idx` ON `session_knowledge_point_occurrences` (`session_history_id`,`knowledge_item_id`,`speaker`,`transcript_turn_index`,`excerpt`);