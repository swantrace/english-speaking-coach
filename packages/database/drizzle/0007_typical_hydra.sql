PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_session_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_type` text NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text,
	`review` text,
	`summary` text,
	`scenario_id` text,
	`selected_character_index` integer,
	`completed_goals` text,
	`free_form_context_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scenario_id`) REFERENCES `scenarios`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`free_form_context_id`) REFERENCES `free_form_contexts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "session_history_session_type_check" CHECK("__new_session_history"."session_type" in ('role-play', 'free-form')),
	CONSTRAINT "session_history_role_play_scenario_required_check" CHECK("__new_session_history"."session_type" != 'role-play' OR "__new_session_history"."scenario_id" IS NOT NULL),
	CONSTRAINT "session_history_free_form_context_required_check" CHECK("__new_session_history"."session_type" != 'free-form' OR "__new_session_history"."free_form_context_id" IS NOT NULL),
	CONSTRAINT "session_history_role_play_selected_character_check" CHECK("__new_session_history"."session_type" != 'role-play' OR ("__new_session_history"."selected_character_index" IS NOT NULL AND "__new_session_history"."selected_character_index" in (0, 1))),
	CONSTRAINT "session_history_free_form_selected_character_null_check" CHECK("__new_session_history"."session_type" != 'free-form' OR "__new_session_history"."selected_character_index" IS NULL),
	CONSTRAINT "session_history_role_play_free_form_context_null_check" CHECK("__new_session_history"."session_type" != 'role-play' OR "__new_session_history"."free_form_context_id" IS NULL),
	CONSTRAINT "session_history_free_form_scenario_null_check" CHECK("__new_session_history"."session_type" != 'free-form' OR "__new_session_history"."scenario_id" IS NULL)
);
--> statement-breakpoint
INSERT INTO `__new_session_history`("id", "user_id", "session_type", "started_at", "ended_at", "review", "summary", "scenario_id", "selected_character_index", "completed_goals", "free_form_context_id") SELECT "id", "user_id", "session_type", "started_at", "ended_at", "review", "summary", "scenario_id", "selected_character_index", "completed_goals", "free_form_context_id" FROM `session_history`;--> statement-breakpoint
DROP TABLE `session_history`;--> statement-breakpoint
ALTER TABLE `__new_session_history` RENAME TO `session_history`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `session_history_started_at_idx` ON `session_history` (`started_at`);--> statement-breakpoint
CREATE INDEX `session_history_user_id_idx` ON `session_history` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_history_user_started_at_idx` ON `session_history` (`user_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `session_history_scenario_id_idx` ON `session_history` (`scenario_id`);--> statement-breakpoint
CREATE INDEX `session_history_free_form_context_id_idx` ON `session_history` (`free_form_context_id`);--> statement-breakpoint
CREATE INDEX `session_history_session_type_idx` ON `session_history` (`session_type`);