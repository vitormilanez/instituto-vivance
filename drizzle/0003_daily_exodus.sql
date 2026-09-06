CREATE TABLE `clinical_patient_permissions` (
	`relationship_id` text PRIMARY KEY NOT NULL,
	`authorized` integer DEFAULT false NOT NULL,
	`paused` integer DEFAULT false NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text NOT NULL,
	`basis` text NOT NULL,
	FOREIGN KEY (`relationship_id`) REFERENCES `care_relationships`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `clinical_policy_members` (
	`user_id` text PRIMARY KEY NOT NULL,
	`clinic_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `clinical_policy_versions` (
	`clinic_id` text NOT NULL,
	`version` integer NOT NULL,
	`snapshot` text NOT NULL,
	PRIMARY KEY(`clinic_id`, `version`),
	FOREIGN KEY (`clinic_id`) REFERENCES `clinical_policy_workspaces`(`clinic_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `clinical_policy_workspaces` (
	`clinic_id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`active_version` integer NOT NULL,
	`data` text NOT NULL
);
