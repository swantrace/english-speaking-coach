CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text DEFAULT 'student' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `free_form_contexts` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `knowledge_items` (
	`id` text PRIMARY KEY NOT NULL,
	`pattern` text NOT NULL,
	`syntax_role` text,
	`fixedness_level` text,
	`communicative_function` text,
	`is_pending_review` integer DEFAULT false NOT NULL,
	`senses` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "knowledge_items_syntax_role_check" CHECK("knowledge_items"."syntax_role" IS NULL OR "knowledge_items"."syntax_role" in ('predicate_verb', 'predicate_adjective', 'adverbial_modifier', 'noun_phrase', 'discourse_linker', 'clause_pattern')),
	CONSTRAINT "knowledge_items_fixedness_level_check" CHECK("knowledge_items"."fixedness_level" IS NULL OR "knowledge_items"."fixedness_level" in ('restricted_collocation', 'fixed_expression', 'idiom')),
	CONSTRAINT "knowledge_items_communicative_function_check" CHECK("knowledge_items"."communicative_function" IS NULL OR "knowledge_items"."communicative_function" in ('manage_social_relation', 'express_attitude_or_opinion', 'make_request_or_offer', 'give_or_seek_information', 'organize_discourse', 'react_in_conversation', 'express_degree_or_soften', 'express_time_or_sequence'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_items_pattern_unique` ON `knowledge_items` (`pattern`);--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_items_pattern_idx` ON `knowledge_items` (`pattern`);--> statement-breakpoint
CREATE INDEX `knowledge_items_is_pending_review_idx` ON `knowledge_items` (`is_pending_review`);--> statement-breakpoint
CREATE TABLE `scenarios` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`setting` text NOT NULL,
	`characters` text NOT NULL,
	`goals` text NOT NULL,
	`example_dialogue` text NOT NULL,
	`is_pending_review` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "scenarios_is_pending_review_check" CHECK("scenarios"."is_pending_review" in (0, 1))
);
--> statement-breakpoint
CREATE INDEX `scenarios_is_pending_review_idx` ON `scenarios` (`is_pending_review`);--> statement-breakpoint
CREATE TABLE `session_errors` (
	`id` text PRIMARY KEY NOT NULL,
	`session_history_id` text NOT NULL,
	`dimension` text NOT NULL,
	`error_description` text NOT NULL,
	`utterance` text NOT NULL,
	`suggestion` text NOT NULL,
	FOREIGN KEY (`session_history_id`) REFERENCES `session_history`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "session_errors_dimension_check" CHECK("session_errors"."dimension" in ('lexical', 'syntactic', 'pragmatic', 'discourse', 'phonological'))
);
--> statement-breakpoint
CREATE INDEX `session_errors_session_history_id_idx` ON `session_errors` (`session_history_id`);--> statement-breakpoint
CREATE TABLE `session_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_type` text NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text,
	`review` text,
	`scenario_id` text,
	`selected_character_index` integer,
	`completed_goals` text,
	`free_form_context_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scenario_id`) REFERENCES `scenarios`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`free_form_context_id`) REFERENCES `free_form_contexts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "session_history_session_type_check" CHECK("session_history"."session_type" in ('role-play', 'free-form')),
	CONSTRAINT "session_history_role_play_check" CHECK("session_history"."session_type" != 'role-play' OR "session_history"."scenario_id" IS NOT NULL),
	CONSTRAINT "session_history_free_form_check" CHECK("session_history"."session_type" != 'free-form' OR "session_history"."free_form_context_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX `session_history_user_id_idx` ON `session_history` (`user_id`);--> statement-breakpoint
CREATE TABLE `session_knowledge_point_occurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`session_history_id` text NOT NULL,
	`knowledge_item_id` text,
	`transcript_turn_index` integer NOT NULL,
	`proposed_pattern` text NOT NULL,
	`utterance` text NOT NULL,
	FOREIGN KEY (`session_history_id`) REFERENCES `session_history`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`knowledge_item_id`) REFERENCES `knowledge_items`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "session_knowledge_point_occurrences_pattern_check" CHECK(length(trim("session_knowledge_point_occurrences"."proposed_pattern")) > 0),
	CONSTRAINT "session_knowledge_point_occurrences_utterance_check" CHECK(length(trim("session_knowledge_point_occurrences"."utterance")) > 0),
	CONSTRAINT "session_knowledge_point_occurrences_turn_index_check" CHECK("session_knowledge_point_occurrences"."transcript_turn_index" >= 0)
);
--> statement-breakpoint
CREATE INDEX `session_knowledge_point_occurrences_session_history_idx` ON `session_knowledge_point_occurrences` (`session_history_id`);--> statement-breakpoint
CREATE INDEX `session_knowledge_point_occurrences_knowledge_item_idx` ON `session_knowledge_point_occurrences` (`knowledge_item_id`);--> statement-breakpoint
CREATE INDEX `session_knowledge_point_occurrences_unresolved_idx` ON `session_knowledge_point_occurrences` (`knowledge_item_id`);--> statement-breakpoint
CREATE INDEX `session_knowledge_point_occurrences_turn_idx` ON `session_knowledge_point_occurrences` (`session_history_id`,`transcript_turn_index`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_knowledge_point_occurrences_unique_idx` ON `session_knowledge_point_occurrences` (`session_history_id`,`transcript_turn_index`,`proposed_pattern`,`utterance`);--> statement-breakpoint
CREATE TABLE `session_transcripts` (
	`id` text PRIMARY KEY NOT NULL,
	`session_history_id` text NOT NULL,
	`turns` text NOT NULL,
	`rewritten_turns` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_history_id`) REFERENCES `session_history`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_transcripts_session_history_id_unique` ON `session_transcripts` (`session_history_id`);--> statement-breakpoint
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
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "submission_jobs_status_check" CHECK("submission_jobs"."status" in ('queued', 'started', 'completed', 'failed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submission_jobs_submission_cursor_idx` ON `submission_jobs` (`submission_id`,`cursor`);--> statement-breakpoint
CREATE UNIQUE INDEX `submission_jobs_job_id_idx` ON `submission_jobs` (`job_id`);--> statement-breakpoint
CREATE INDEX `submission_jobs_submission_idx` ON `submission_jobs` (`submission_id`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`created_at` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`total_count` integer NOT NULL,
	`updated_at` text NOT NULL,
	`user_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "submissions_kind_check" CHECK("submissions"."kind" in ('scenario.generate', 'knowledge.generate'))
);
--> statement-breakpoint
CREATE INDEX `submissions_kind_idx` ON `submissions` (`kind`);