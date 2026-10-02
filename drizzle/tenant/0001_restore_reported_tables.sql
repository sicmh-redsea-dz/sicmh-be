CREATE TABLE `audit_logs` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`actor_id` varchar(36),
	`action` enum('create','update','delete','view') NOT NULL,
	`target_table` varchar(100) NOT NULL,
	`record_id` varchar(100),
	`occurred_at` timestamp(3) NOT NULL,
	`ip_address` varchar(45),
	`details` json,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consent_instances` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`template_id` varchar(36) NOT NULL,
	`clinical_encounter_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`staff_member_id` varchar(36) NOT NULL,
	`template_version` int NOT NULL,
	`status` enum('printed','accepted') NOT NULL,
	`acceptance_method` enum('checkbox','drawn_signature','physical'),
	`signer_type` varchar(30),
	`signer_name` varchar(200),
	`signer_identification` varchar(50),
	`signer_relationship` varchar(100),
	`signer_phone` varchar(30),
	`attachment_id` varchar(36),
	`accepted_at` timestamp(3),
	`printed_at` timestamp(3),
	CONSTRAINT `consent_instances_id` PRIMARY KEY(`id`),
	CONSTRAINT `consent_instances_visit_template_unique` UNIQUE(`clinical_encounter_id`,`template_id`)
);
--> statement-breakpoint
CREATE TABLE `consent_template_versions` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`template_id` varchar(36) NOT NULL,
	`version` int NOT NULL,
	`content` text NOT NULL,
	CONSTRAINT `consent_template_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `consent_template_versions_unique` UNIQUE(`template_id`,`version`)
);
--> statement-breakpoint
CREATE TABLE `consent_templates` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`name` varchar(200) NOT NULL,
	`current_version` int NOT NULL DEFAULT 1,
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `consent_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `consent_templates_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `document_deliveries` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`attachment_id` varchar(36),
	`clinical_encounter_id` varchar(36),
	`template_id` varchar(36),
	`actor_id` varchar(36),
	`document_type` enum('attachment','consent','consent_draft','invoice_report') NOT NULL,
	`channel` enum('view','download') NOT NULL,
	`status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`completed_at` timestamp(3),
	`http_status` int,
	`ip_address` varchar(45),
	CONSTRAINT `document_deliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoice_number_sequences` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`code` varchar(50) NOT NULL,
	`active_key` varchar(10),
	`prefix` varchar(30) NOT NULL DEFAULT '',
	`padding` int NOT NULL DEFAULT 8,
	`min_number` int NOT NULL,
	`max_number` int NOT NULL,
	`current_number` int NOT NULL,
	`cai` varchar(100) NOT NULL,
	CONSTRAINT `invoice_number_sequences_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoice_number_sequences_code_unique` UNIQUE(`code`),
	CONSTRAINT `invoice_number_sequences_active_unique` UNIQUE(`active_key`),
	CONSTRAINT `invoice_number_sequences_range_check` CHECK(`invoice_number_sequences`.`min_number` > 0 AND `invoice_number_sequences`.`max_number` >= `invoice_number_sequences`.`min_number` AND `invoice_number_sequences`.`current_number` >= `invoice_number_sequences`.`min_number` - 1 AND `invoice_number_sequences`.`current_number` <= `invoice_number_sequences`.`max_number`),
	CONSTRAINT `invoice_number_sequences_padding_check` CHECK(`invoice_number_sequences`.`padding` BETWEEN 1 AND 10),
	CONSTRAINT `invoice_number_sequences_active_check` CHECK(`invoice_number_sequences`.`active_key` IS NULL OR `invoice_number_sequences`.`active_key` = 'sar')
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`user_id` varchar(36) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`revoked_at` timestamp,
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
ALTER TABLE `invoices` ADD `number_sequence_id` varchar(36);--> statement-breakpoint
ALTER TABLE `invoices` ADD `sar_number` varchar(50);--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_sar_number_unique` UNIQUE(`sar_number`);--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `consent_instances` ADD CONSTRAINT `consent_instances_template_id_consent_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `consent_templates`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `consent_instances` ADD CONSTRAINT `consent_instances_encounter_fk` FOREIGN KEY (`clinical_encounter_id`) REFERENCES `clinical_encounters`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `consent_instances` ADD CONSTRAINT `consent_instances_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `consent_instances` ADD CONSTRAINT `consent_instances_staff_member_id_staff_members_id_fk` FOREIGN KEY (`staff_member_id`) REFERENCES `staff_members`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `consent_instances` ADD CONSTRAINT `consent_instances_attachment_id_clinical_attachments_id_fk` FOREIGN KEY (`attachment_id`) REFERENCES `clinical_attachments`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `consent_instances` ADD CONSTRAINT `consent_instances_version_fk` FOREIGN KEY (`template_id`,`template_version`) REFERENCES `consent_template_versions`(`template_id`,`version`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `consent_template_versions` ADD CONSTRAINT `consent_template_versions_template_id_consent_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `consent_templates`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `document_deliveries` ADD CONSTRAINT `document_deliveries_attachment_id_clinical_attachments_id_fk` FOREIGN KEY (`attachment_id`) REFERENCES `clinical_attachments`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `document_deliveries` ADD CONSTRAINT `document_deliveries_encounter_fk` FOREIGN KEY (`clinical_encounter_id`) REFERENCES `clinical_encounters`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `document_deliveries` ADD CONSTRAINT `document_deliveries_template_id_consent_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `consent_templates`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `document_deliveries` ADD CONSTRAINT `document_deliveries_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `audit_logs_target_idx` ON `audit_logs` (`target_table`,`record_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_actor_idx` ON `audit_logs` (`actor_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `consent_instances_patient_idx` ON `consent_instances` (`patient_id`,`created_at`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `consent_instances_attachment_idx` ON `consent_instances` (`attachment_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `consent_template_versions_template_idx` ON `consent_template_versions` (`template_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `consent_templates_active_idx` ON `consent_templates` (`is_active`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `document_deliveries_attachment_idx` ON `document_deliveries` (`attachment_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `document_deliveries_encounter_idx` ON `document_deliveries` (`clinical_encounter_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `document_deliveries_status_idx` ON `document_deliveries` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_user_idx` ON `password_reset_tokens` (`user_id`,`expires_at`);--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_number_sequence_id_invoice_number_sequences_id_fk` FOREIGN KEY (`number_sequence_id`) REFERENCES `invoice_number_sequences`(`id`) ON DELETE restrict ON UPDATE cascade;
