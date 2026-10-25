CREATE TABLE `encounter_clinical_reviews` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`clinical_encounter_id` varchar(36) NOT NULL,
	`profile_id` varchar(36) NOT NULL,
	`reviewed_by` varchar(36) NOT NULL,
	CONSTRAINT `encounter_clinical_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `encounter_clinical_reviews_encounter_unique` UNIQUE(`clinical_encounter_id`)
);
--> statement-breakpoint
CREATE TABLE `patient_clinical_profiles` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`patient_id` varchar(36) NOT NULL,
	`version` int NOT NULL,
	`data` json NOT NULL,
	`recorded_by` varchar(36) NOT NULL,
	CONSTRAINT `patient_clinical_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `patient_clinical_profiles_version_unique` UNIQUE(`patient_id`,`version`)
);
--> statement-breakpoint
ALTER TABLE `consent_instances` ADD `consent_template_version_id` varchar(36);--> statement-breakpoint
ALTER TABLE `consent_instances` ADD `template_name` varchar(200);--> statement-breakpoint
ALTER TABLE `consent_instances` ADD `patient_id` varchar(36);--> statement-breakpoint
ALTER TABLE `consent_instances` ADD `snapshot_json` json;--> statement-breakpoint
ALTER TABLE `consent_instances` ADD `document_sha256` varchar(64);--> statement-breakpoint
ALTER TABLE `consent_instances` ADD `created_by` varchar(36);--> statement-breakpoint
ALTER TABLE `consent_instances` ADD `accepted_by` varchar(36);--> statement-breakpoint
ALTER TABLE `consent_template_versions` ADD `created_by` varchar(36);--> statement-breakpoint
ALTER TABLE `consent_templates` ADD `created_by` varchar(36);--> statement-breakpoint
ALTER TABLE `patients` ADD `identification_type` varchar(30) DEFAULT 'identidad' NOT NULL;--> statement-breakpoint
ALTER TABLE `patients` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `gender` enum('male','female','unspecified');--> statement-breakpoint
ALTER TABLE `encounter_clinical_reviews` ADD CONSTRAINT `clinical_review_encounter_fk` FOREIGN KEY (`clinical_encounter_id`) REFERENCES `clinical_encounters`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `encounter_clinical_reviews` ADD CONSTRAINT `clinical_review_profile_fk` FOREIGN KEY (`profile_id`) REFERENCES `patient_clinical_profiles`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `encounter_clinical_reviews` ADD CONSTRAINT `clinical_review_actor_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `patient_clinical_profiles` ADD CONSTRAINT `clinical_profile_patient_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `patient_clinical_profiles` ADD CONSTRAINT `clinical_profile_actor_fk` FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `consent_instances` ADD CONSTRAINT `consent_instance_version_id_fk` FOREIGN KEY (`consent_template_version_id`) REFERENCES `consent_template_versions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consent_instances` ADD CONSTRAINT `consent_instances_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consent_instances` ADD CONSTRAINT `consent_instances_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consent_instances` ADD CONSTRAINT `consent_instances_accepted_by_users_id_fk` FOREIGN KEY (`accepted_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consent_template_versions` ADD CONSTRAINT `consent_template_versions_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consent_templates` ADD CONSTRAINT `consent_templates_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
UPDATE `consent_instances` AS ci
JOIN `consent_template_versions` AS v ON v.template_id = ci.template_id AND v.version = ci.template_version
JOIN `consent_templates` AS t ON t.id = ci.template_id
JOIN `clinical_encounters` AS e ON e.id = ci.clinical_encounter_id
SET ci.consent_template_version_id = v.id, ci.template_name = t.name, ci.patient_id = e.patient_id;
