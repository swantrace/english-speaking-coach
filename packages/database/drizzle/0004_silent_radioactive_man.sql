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
	`example` text,
	`source` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "knowledge_items_source_check" CHECK("knowledge_items"."source" in ('admin', 'auto_generated')),
	CONSTRAINT "knowledge_items_syntax_role_check" CHECK("knowledge_items"."syntax_role" IS NULL OR "knowledge_items"."syntax_role" in ('predicate_verb', 'predicate_adjective', 'adverbial_modifier', 'noun_phrase', 'discourse_linker', 'clause_pattern')),
	CONSTRAINT "knowledge_items_fixedness_level_check" CHECK("knowledge_items"."fixedness_level" IS NULL OR "knowledge_items"."fixedness_level" in ('restricted_collocation', 'fixed_expression', 'idiom')),
	CONSTRAINT "knowledge_items_communicative_function_check" CHECK("knowledge_items"."communicative_function" IS NULL OR "knowledge_items"."communicative_function" in ('manage_social_relation', 'express_attitude_or_opinion', 'make_request_or_offer', 'give_or_seek_information', 'organize_discourse', 'react_in_conversation', 'express_degree_or_soften', 'express_time_or_sequence'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_items_pattern_unique` ON `knowledge_items` (`pattern`);--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_items_pattern_idx` ON `knowledge_items` (`pattern`);--> statement-breakpoint
CREATE TABLE `scenarios` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`setting` text NOT NULL,
	`characters` text NOT NULL,
	`goals` text NOT NULL,
	`example_dialogue` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE `session_knowledge_items` (
	`id` text PRIMARY KEY NOT NULL,
	`session_history_id` text NOT NULL,
	`knowledge_item_id` text NOT NULL,
	`speaker` text NOT NULL,
	`count` integer NOT NULL,
	`examples` text NOT NULL,
	FOREIGN KEY (`session_history_id`) REFERENCES `session_history`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`knowledge_item_id`) REFERENCES `knowledge_items`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "session_knowledge_items_speaker_check" CHECK("session_knowledge_items"."speaker" in ('user', 'agent'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_knowledge_items_unique_idx` ON `session_knowledge_items` (`session_history_id`,`knowledge_item_id`,`speaker`);--> statement-breakpoint
CREATE TABLE `session_transcripts` (
	`id` text PRIMARY KEY NOT NULL,
	`session_history_id` text NOT NULL,
	`turns` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_history_id`) REFERENCES `session_history`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_transcripts_session_history_id_unique` ON `session_transcripts` (`session_history_id`);--> statement-breakpoint
ALTER TABLE `user` ADD `role` text DEFAULT 'student' NOT NULL;--> statement-breakpoint
ALTER TABLE `submissions` ADD `user_id` text REFERENCES user(id);