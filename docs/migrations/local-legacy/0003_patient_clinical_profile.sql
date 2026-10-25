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
ALTER TABLE `encounter_clinical_reviews` ADD CONSTRAINT `clinical_review_encounter_fk` FOREIGN KEY (`clinical_encounter_id`) REFERENCES `clinical_encounters`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `encounter_clinical_reviews` ADD CONSTRAINT `clinical_review_profile_fk` FOREIGN KEY (`profile_id`) REFERENCES `patient_clinical_profiles`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `encounter_clinical_reviews` ADD CONSTRAINT `clinical_review_actor_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `patient_clinical_profiles` ADD CONSTRAINT `clinical_profile_patient_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `patient_clinical_profiles` ADD CONSTRAINT `clinical_profile_actor_fk` FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE cascade;