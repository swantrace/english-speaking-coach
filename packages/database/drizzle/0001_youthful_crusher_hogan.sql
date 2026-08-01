PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_session_knowledge_point_occurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`session_history_id` text NOT NULL,
	`knowledge_item_id` text,
	`transcript_turn_index` integer NOT NULL,
	`proposed_pattern` text NOT NULL,
	`proposed_pattern_type` text,
	`proposed_fixedness_level` text,
	`proposed_communicative_function` text,
	`proposed_senses` text,
	`utterance` text NOT NULL,
	`status` text DEFAULT 'proposed' NOT NULL,
	`reviewed_at` text,
	`reviewed_by_user_id` text,
	`rejection_reason` text,
	FOREIGN KEY (`session_history_id`) REFERENCES `session_history`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`knowledge_item_id`) REFERENCES `knowledge_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "session_knowledge_point_occurrences_pattern_check" CHECK(length(trim("__new_session_knowledge_point_occurrences"."proposed_pattern")) > 0),
	CONSTRAINT "session_knowledge_point_occurrences_pattern_type_check" CHECK("__new_session_knowledge_point_occurrences"."proposed_pattern_type" IS NULL OR "__new_session_knowledge_point_occurrences"."proposed_pattern_type" in ('lexical_verb_noun', 'lexical_adjective_noun', 'lexical_noun_verb', 'lexical_noun_of_noun', 'lexical_adverb_adjective', 'lexical_verb_particle', 'grammatical_preposition_noun', 'grammatical_preposition_noun_preposition', 'grammatical_adjective_preposition', 'grammatical_adjective_to_infinitive', 'grammatical_adjective_that_clause', 'grammatical_verb_preposition', 'grammatical_verb_to_infinitive', 'grammatical_verb_that_clause', 'grammatical_verb_noun_preposition', 'grammatical_verb_particle_preposition', 'grammatical_noun_preposition', 'grammatical_noun_to_infinitive', 'grammatical_noun_that_clause', 'grammatical_conjunction_phrase', 'grammatical_modal_semi_modal_phrase')),
	CONSTRAINT "session_knowledge_point_occurrences_fixedness_level_check" CHECK("__new_session_knowledge_point_occurrences"."proposed_fixedness_level" IS NULL OR "__new_session_knowledge_point_occurrences"."proposed_fixedness_level" in ('restricted_collocation', 'fixed_expression', 'idiom')),
	CONSTRAINT "session_knowledge_point_occurrences_communicative_function_check" CHECK("__new_session_knowledge_point_occurrences"."proposed_communicative_function" IS NULL OR "__new_session_knowledge_point_occurrences"."proposed_communicative_function" in ('manage_social_relation', 'express_attitude_or_opinion', 'make_request_or_offer', 'give_or_seek_information', 'organize_discourse', 'react_in_conversation', 'express_degree_or_soften', 'express_time_or_sequence')),
	CONSTRAINT "session_knowledge_point_occurrences_utterance_check" CHECK(length(trim("__new_session_knowledge_point_occurrences"."utterance")) > 0),
	CONSTRAINT "session_knowledge_point_occurrences_turn_index_check" CHECK("__new_session_knowledge_point_occurrences"."transcript_turn_index" >= 0),
	CONSTRAINT "session_knowledge_point_occurrences_status_check" CHECK("__new_session_knowledge_point_occurrences"."status" in ('proposed', 'approved', 'rejected'))
);
--> statement-breakpoint
INSERT INTO `__new_session_knowledge_point_occurrences`("id", "session_history_id", "knowledge_item_id", "transcript_turn_index", "proposed_pattern", "proposed_pattern_type", "proposed_fixedness_level", "proposed_communicative_function", "proposed_senses", "utterance", "status", "reviewed_at", "reviewed_by_user_id", "rejection_reason") SELECT "id", "session_history_id", "knowledge_item_id", "transcript_turn_index", "proposed_pattern", NULL, NULL, NULL, NULL, "utterance", "status", "reviewed_at", "reviewed_by_user_id", "rejection_reason" FROM `session_knowledge_point_occurrences`;--> statement-breakpoint
DROP TABLE `session_knowledge_point_occurrences`;--> statement-breakpoint
ALTER TABLE `__new_session_knowledge_point_occurrences` RENAME TO `session_knowledge_point_occurrences`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `session_knowledge_point_occurrences_session_history_idx` ON `session_knowledge_point_occurrences` (`session_history_id`);--> statement-breakpoint
CREATE INDEX `session_knowledge_point_occurrences_knowledge_item_idx` ON `session_knowledge_point_occurrences` (`knowledge_item_id`);--> statement-breakpoint
CREATE INDEX `session_knowledge_point_occurrences_unresolved_idx` ON `session_knowledge_point_occurrences` (`knowledge_item_id`);--> statement-breakpoint
CREATE INDEX `session_knowledge_point_occurrences_turn_idx` ON `session_knowledge_point_occurrences` (`session_history_id`,`transcript_turn_index`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_knowledge_point_occurrences_unique_idx` ON `session_knowledge_point_occurrences` (`session_history_id`,`transcript_turn_index`,`proposed_pattern`,`utterance`);
