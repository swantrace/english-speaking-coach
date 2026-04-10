PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_knowledge_items` (
	`id` text PRIMARY KEY NOT NULL,
	`pattern` text NOT NULL,
	`syntax_role` text,
	`fixedness_level` text,
	`communicative_function` text,
	`is_pending_review` integer NOT NULL DEFAULT 0,
	`senses` text NOT NULL DEFAULT '[]',
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `knowledge_items_syntax_role_check` CHECK("__new_knowledge_items".`syntax_role` IS NULL OR "__new_knowledge_items".`syntax_role` in ('predicate_verb', 'predicate_adjective', 'adverbial_modifier', 'noun_phrase', 'discourse_linker', 'clause_pattern')),
	CONSTRAINT `knowledge_items_fixedness_level_check` CHECK("__new_knowledge_items".`fixedness_level` IS NULL OR "__new_knowledge_items".`fixedness_level` in ('restricted_collocation', 'fixed_expression', 'idiom')),
	CONSTRAINT `knowledge_items_communicative_function_check` CHECK("__new_knowledge_items".`communicative_function` IS NULL OR "__new_knowledge_items".`communicative_function` in ('manage_social_relation', 'express_attitude_or_opinion', 'make_request_or_offer', 'give_or_seek_information', 'organize_discourse', 'react_in_conversation', 'express_degree_or_soften', 'express_time_or_sequence'))
);--> statement-breakpoint
INSERT INTO `__new_knowledge_items` (
	`id`,
	`pattern`,
	`syntax_role`,
	`fixedness_level`,
	`communicative_function`,
	`is_pending_review`,
	`senses`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	`pattern`,
	`syntax_role`,
	`fixedness_level`,
	`communicative_function`,
	CASE WHEN coalesce(`review_status`, 'approved') = 'pending_review' THEN 1 ELSE 0 END,
	'[]',
	`created_at`,
	`updated_at`
FROM `knowledge_items`;--> statement-breakpoint
DROP TABLE `knowledge_items`;--> statement-breakpoint
ALTER TABLE `__new_knowledge_items` RENAME TO `knowledge_items`;--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_items_pattern_unique` ON `knowledge_items` (`pattern`);--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_items_pattern_idx` ON `knowledge_items` (`pattern`);--> statement-breakpoint
CREATE INDEX `knowledge_items_is_pending_review_idx` ON `knowledge_items` (`is_pending_review`);--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint