CREATE TABLE `clinical_synthesis_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`relationship_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`encounter_id` text NOT NULL,
	`version` integer NOT NULL,
	`request_id` text NOT NULL,
	`created_by` text NOT NULL,
	`artifact` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`relationship_id`) REFERENCES `care_relationships`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "synthesis_positive_version" CHECK("clinical_synthesis_versions"."version" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `synthesis_scope_version_unique` ON `clinical_synthesis_versions` (`relationship_id`,`encounter_id`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `synthesis_request_unique` ON `clinical_synthesis_versions` (`created_by`,`request_id`);