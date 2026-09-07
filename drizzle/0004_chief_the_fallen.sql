CREATE TABLE `admin_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`subject_id` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `admin_events_subject_time` ON `admin_events` (`subject_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `institute_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`contact` text NOT NULL,
	`hours` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
PRAGMA defer_foreign_keys=ON;
--> statement-breakpoint
CREATE TABLE __admin_saved_sessions AS SELECT * FROM sessions;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`patient_id` text,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`password_iterations` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`professional_registration` text DEFAULT '' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "users_role_check" CHECK("__new_users"."role" in ('professional', 'patient', 'admin')),
	CONSTRAINT "users_status_check" CHECK("__new_users"."status" in ('active', 'blocked')),
	CONSTRAINT "users_patient_scope_check" CHECK(("__new_users"."role" = 'patient' and "__new_users"."patient_id" is not null) or ("__new_users"."role" in ('professional', 'admin') and "__new_users"."patient_id" is null))
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "username", "display_name", "role", "patient_id", "password_hash", "password_salt", "password_iterations", "status", "created_at", "updated_at", "email", "phone", "professional_registration", "revision") SELECT "id", "username", "display_name", "role", "patient_id", "password_hash", "password_salt", "password_iterations", "status", "created_at", "updated_at", '', '', '', 0 FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
INSERT INTO sessions SELECT * FROM __admin_saved_sessions;
--> statement-breakpoint
DROP TABLE __admin_saved_sessions;
--> statement-breakpoint
PRAGMA defer_foreign_keys=OFF;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
DROP INDEX `care_relationships_professional_patient_unique`;--> statement-breakpoint
DROP INDEX `care_relationships_patient_profile_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `care_relationships_professional_patient_unique` ON `care_relationships` (`professional_user_id`,`patient_user_id`) WHERE "care_relationships"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX `care_relationships_patient_profile_unique` ON `care_relationships` (`patient_profile_id`) WHERE "care_relationships"."status" = 'active';