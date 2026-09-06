CREATE TABLE `care_cycle_mutations` (
	`id` text PRIMARY KEY NOT NULL,
	`cycle_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`request_id` text NOT NULL,
	`command` text NOT NULL,
	`input_hash` text NOT NULL,
	`result` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`cycle_id`) REFERENCES `care_cycles`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `care_cycle_request_unique` ON `care_cycle_mutations` (`actor_id`,`request_id`);--> statement-breakpoint
CREATE TABLE `care_cycles` (
	`id` text PRIMARY KEY NOT NULL,
	`relationship_id` text NOT NULL,
	`encounter_id` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`data` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`relationship_id`) REFERENCES `care_relationships`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `care_cycle_scope_unique` ON `care_cycles` (`relationship_id`,`encounter_id`);--> statement-breakpoint
CREATE TABLE `care_files` (
	`id` text PRIMARY KEY NOT NULL,
	`relationship_id` text NOT NULL,
	`encounter_id` text NOT NULL,
	`uploaded_by` text NOT NULL,
	`name` text NOT NULL,
	`media_type` text NOT NULL,
	`size` integer NOT NULL,
	`object_key` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`relationship_id`) REFERENCES `care_relationships`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `care_files_scope` ON `care_files` (`relationship_id`,`encounter_id`);