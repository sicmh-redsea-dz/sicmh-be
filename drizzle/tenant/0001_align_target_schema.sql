-- Align the initial 46-table schema with the supplied 2026-10-22 target.
-- Existing target tables are intentionally retained. This does not convert
-- incompatible intermediate consent schemas; run the compatibility tests first.
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` varchar(36) NOT NULL,
  `actor_id` varchar(36) DEFAULT NULL,
  `action_type` enum('Create','Update','Delete','View') NOT NULL,
  `target_table` varchar(64) NOT NULL,
  `record_id` varchar(100) DEFAULT NULL,
  `occurred_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `details` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `audit_logs_actor_idx` (`actor_id`),
  KEY `audit_logs_target_idx` (`target_table`,`record_id`,`occurred_at`),
  KEY `audit_logs_occurred_idx` (`occurred_at`),
  CONSTRAINT `audit_logs_actor_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `consent_templates` (
  `id` varchar(36) NOT NULL,
  `name` varchar(160) NOT NULL,
  `current_version_number` int NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` varchar(36) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `consent_templates_active_idx` (`is_active`,`name`),
  KEY `consent_templates_creator_idx` (`created_by`),
  CONSTRAINT `consent_templates_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `consent_template_versions` (
  `id` varchar(36) NOT NULL,
  `consent_template_id` varchar(36) NOT NULL,
  `version_number` int NOT NULL,
  `content` mediumtext NOT NULL,
  `created_by` varchar(36) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `consent_template_versions_number_unique` (`consent_template_id`,`version_number`),
  KEY `consent_template_versions_creator_idx` (`created_by`),
  CONSTRAINT `consent_template_versions_consent_template_id_fk` FOREIGN KEY (`consent_template_id`) REFERENCES `consent_templates` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `consent_template_versions_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `consent_instances` (
  `id` varchar(36) NOT NULL,
  `consent_template_id` varchar(36) NOT NULL,
  `consent_template_version_id` varchar(36) NOT NULL,
  `template_name` varchar(160) NOT NULL,
  `patient_id` varchar(36) NOT NULL,
  `clinical_encounter_id` varchar(36) NOT NULL,
  `staff_member_id` varchar(36) NOT NULL,
  `status` enum('printed','accepted') NOT NULL,
  `acceptance_method` enum('checkbox','drawn_signature','physical') DEFAULT NULL,
  `signer_type` enum('patient','guardian') DEFAULT NULL,
  `signer_name` varchar(200) DEFAULT NULL,
  `signer_identification` varchar(100) DEFAULT NULL,
  `signer_relationship` varchar(100) DEFAULT NULL,
  `signer_phone` varchar(50) DEFAULT NULL,
  `signer_email` varchar(254) DEFAULT NULL,
  `signer_signature_object_path` varchar(1024) DEFAULT NULL,
  `doctor_signature_object_path` varchar(1024) DEFAULT NULL,
  `doctor_stamp_object_path` varchar(1024) DEFAULT NULL,
  `clinical_attachment_id` varchar(36) DEFAULT NULL,
  `document_sha256` char(64) DEFAULT NULL,
  `snapshot_json` json NOT NULL,
  `created_by` varchar(36) NOT NULL,
  `accepted_by` varchar(36) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `accepted_at` datetime DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `consent_instances_encounter_idx` (`clinical_encounter_id`,`status`),
  KEY `consent_instances_patient_idx` (`patient_id`,`created_at`),
  KEY `consent_instances_attachment_idx` (`clinical_attachment_id`),
  KEY `consent_instances_template_idx` (`consent_template_id`),
  KEY `consent_instances_version_idx` (`consent_template_version_id`),
  KEY `consent_instances_staff_idx` (`staff_member_id`),
  KEY `consent_instances_creator_idx` (`created_by`),
  KEY `consent_instances_acceptor_idx` (`accepted_by`),
  CONSTRAINT `consent_instances_accepted_by_fk` FOREIGN KEY (`accepted_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `consent_instances_clinical_attachment_id_fk` FOREIGN KEY (`clinical_attachment_id`) REFERENCES `clinical_attachments` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `consent_instances_clinical_encounter_id_fk` FOREIGN KEY (`clinical_encounter_id`) REFERENCES `clinical_encounters` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `consent_instances_consent_template_id_fk` FOREIGN KEY (`consent_template_id`) REFERENCES `consent_templates` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `consent_instances_consent_template_version_id_fk` FOREIGN KEY (`consent_template_version_id`) REFERENCES `consent_template_versions` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `consent_instances_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `consent_instances_patient_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `consent_instances_staff_member_id_fk` FOREIGN KEY (`staff_member_id`) REFERENCES `staff_members` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `document_deliveries` (
  `id` varchar(36) NOT NULL,
  `document_type` enum('consent','invoice','receipt') NOT NULL,
  `source_id` varchar(100) NOT NULL,
  `source_version` varchar(50) NOT NULL DEFAULT '1',
  `recipient_email` varchar(190) DEFAULT NULL,
  `status` enum('pending','processing','sent','retry','failed','skipped') NOT NULL,
  `skip_reason` enum('missing_recipient_email','invalid_recipient_email') DEFAULT NULL,
  `attempt_count` smallint unsigned NOT NULL DEFAULT '0',
  `next_attempt_at` datetime DEFAULT NULL,
  `claimed_at` datetime DEFAULT NULL,
  `claim_token` char(36) DEFAULT NULL,
  `snapshot_json` json NOT NULL,
  `source_object_path` varchar(512) DEFAULT NULL,
  `storage_object_path` varchar(512) DEFAULT NULL,
  `pdf_sha256` char(64) DEFAULT NULL,
  `email_provider_id` varchar(255) DEFAULT NULL,
  `last_error` varchar(1000) DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `document_deliveries_source_version_unique` (`document_type`,`source_id`,`source_version`),
  KEY `document_deliveries_claim_idx` (`status`,`next_attempt_at`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `invoice_number_sequences` (
  `id` varchar(36) NOT NULL,
  `current_number` int NOT NULL,
  `min_number` int NOT NULL,
  `max_number` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `password_reset_tokens_hash_unique` (`token_hash`),
  KEY `password_reset_tokens_user_created_idx` (`user_id`,`created_at`),
  KEY `password_reset_tokens_expiry_idx` (`expires_at`),
  CONSTRAINT `password_reset_tokens_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resource_types` (
  `id` varchar(36) NOT NULL,
  `code` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `resource_types_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
