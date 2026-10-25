-- Schema definitions only, from medit-test-latest.sql; no production data.
CREATE TABLE `appointment_sources` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `appointment_sources_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `appointment_statuses` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `appointment_statuses_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `appointment_types` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `color` varchar(10) NOT NULL DEFAULT '#6B7280',
  PRIMARY KEY (`id`),
  UNIQUE KEY `appointment_types_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `appointments` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `type_id` varchar(36) NOT NULL,
  `status_id` varchar(36) NOT NULL,
  `source_id` varchar(36) NOT NULL,
  `staff_member_id` varchar(36) DEFAULT NULL,
  `patient_id` varchar(36) DEFAULT NULL,
  `bed_id` varchar(36) DEFAULT NULL,
  `operating_room_id` varchar(36) DEFAULT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `starts_at` timestamp(3) NOT NULL,
  `ends_at` timestamp(3) NOT NULL,
  `patient_name` varchar(200) DEFAULT NULL,
  `external_id` varchar(255) DEFAULT NULL,
  `chatbot_session_id` varchar(255) DEFAULT NULL,
  `notes` text,
  `google_calendar_event_id` varchar(255) DEFAULT NULL,
  `google_calendar_synced_at` timestamp(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `appointments_google_event_unique` (`google_calendar_event_id`),
  KEY `appointments_type_id_appointment_types_id_fk` (`type_id`),
  KEY `appointments_status_id_appointment_statuses_id_fk` (`status_id`),
  KEY `appointments_source_id_appointment_sources_id_fk` (`source_id`),
  KEY `appointments_bed_id_beds_id_fk` (`bed_id`),
  KEY `appointments_operating_room_id_operating_rooms_id_fk` (`operating_room_id`),
  KEY `appointments_created_by_users_id_fk` (`created_by`),
  KEY `appointments_period_idx` (`starts_at`,`ends_at`,`deleted_at`),
  KEY `appointments_staff_period_idx` (`staff_member_id`,`starts_at`,`ends_at`,`deleted_at`),
  KEY `appointments_patient_idx` (`patient_id`,`starts_at`,`deleted_at`),
  CONSTRAINT `appointments_bed_id_beds_id_fk` FOREIGN KEY (`bed_id`) REFERENCES `beds` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `appointments_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `appointments_operating_room_id_operating_rooms_id_fk` FOREIGN KEY (`operating_room_id`) REFERENCES `operating_rooms` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `appointments_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `appointments_source_id_appointment_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `appointment_sources` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `appointments_staff_member_id_staff_members_id_fk` FOREIGN KEY (`staff_member_id`) REFERENCES `staff_members` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `appointments_status_id_appointment_statuses_id_fk` FOREIGN KEY (`status_id`) REFERENCES `appointment_statuses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `appointments_type_id_appointment_types_id_fk` FOREIGN KEY (`type_id`) REFERENCES `appointment_types` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `attachment_access_logs` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `attachment_id` varchar(36) NOT NULL,
  `accessed_by` varchar(36) DEFAULT NULL,
  `accessed_at` timestamp(3) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `attachment_access_logs_accessed_by_users_id_fk` (`accessed_by`),
  KEY `attachment_access_attachment_idx` (`attachment_id`,`accessed_at`),
  CONSTRAINT `attachment_access_logs_accessed_by_users_id_fk` FOREIGN KEY (`accessed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `attachment_access_logs_attachment_id_clinical_attachments_id_fk` FOREIGN KEY (`attachment_id`) REFERENCES `clinical_attachments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `audit_logs` (
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

CREATE TABLE `bed_assignments` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `bed_id` varchar(36) NOT NULL,
  `patient_id` varchar(36) NOT NULL,
  `staff_member_id` varchar(36) DEFAULT NULL,
  `care_episode_id` varchar(36) DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `notes` text,
  `expected_discharge_at` timestamp(3) NULL DEFAULT NULL,
  `assigned_at` timestamp(3) NOT NULL,
  `released_at` timestamp(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bed_assignments_staff_member_id_staff_members_id_fk` (`staff_member_id`),
  KEY `bed_assignments_care_episode_id_care_episodes_id_fk` (`care_episode_id`),
  KEY `bed_assignments_bed_idx` (`bed_id`,`released_at`,`deleted_at`),
  KEY `bed_assignments_patient_idx` (`patient_id`,`assigned_at`,`deleted_at`),
  CONSTRAINT `bed_assignments_bed_id_beds_id_fk` FOREIGN KEY (`bed_id`) REFERENCES `beds` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `bed_assignments_care_episode_id_care_episodes_id_fk` FOREIGN KEY (`care_episode_id`) REFERENCES `care_episodes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `bed_assignments_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `bed_assignments_staff_member_id_staff_members_id_fk` FOREIGN KEY (`staff_member_id`) REFERENCES `staff_members` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `bed_events` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `bed_id` varchar(36) NOT NULL,
  `assignment_id` varchar(36) DEFAULT NULL,
  `actor_id` varchar(36) DEFAULT NULL,
  `type` varchar(50) NOT NULL,
  `occurred_at` timestamp(3) NOT NULL,
  `details` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bed_events_assignment_id_bed_assignments_id_fk` (`assignment_id`),
  KEY `bed_events_actor_id_users_id_fk` (`actor_id`),
  KEY `bed_events_bed_idx` (`bed_id`,`occurred_at`,`deleted_at`),
  CONSTRAINT `bed_events_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `bed_events_assignment_id_bed_assignments_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `bed_assignments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `bed_events_bed_id_beds_id_fk` FOREIGN KEY (`bed_id`) REFERENCES `beds` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `beds` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `code` varchar(50) NOT NULL,
  `module` enum('hospitalization','emergency') NOT NULL,
  `area` varchar(100) DEFAULT NULL,
  `status` enum('available','occupied','maintenance','blocked') NOT NULL DEFAULT 'available',
  PRIMARY KEY (`id`),
  UNIQUE KEY `beds_module_code_unique` (`module`,`code`),
  KEY `beds_status_idx` (`module`,`status`,`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `billing_ledger_entries` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `patient_id` varchar(36) NOT NULL,
  `care_episode_id` varchar(36) DEFAULT NULL,
  `invoice_id` varchar(36) DEFAULT NULL,
  `product_id` varchar(36) DEFAULT NULL,
  `service_id` varchar(36) DEFAULT NULL,
  `movement_id` varchar(36) DEFAULT NULL,
  `station` varchar(50) DEFAULT NULL,
  `category` varchar(50) NOT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `unit_price` decimal(12,2) NOT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  `occurred_at` timestamp(3) NOT NULL,
  `status` enum('Pagado','Pendiente','Anulado') NOT NULL,
  `source` enum('invoice','stock','manual','movement') NOT NULL,
  PRIMARY KEY (`id`),
  KEY `billing_ledger_entries_product_id_products_id_fk` (`product_id`),
  KEY `billing_ledger_entries_service_id_services_id_fk` (`service_id`),
  KEY `billing_ledger_patient_idx` (`patient_id`,`occurred_at`,`deleted_at`),
  KEY `billing_ledger_invoice_idx` (`invoice_id`,`deleted_at`),
  KEY `billing_ledger_episode_idx` (`care_episode_id`,`deleted_at`),
  CONSTRAINT `billing_ledger_entries_care_episode_id_care_episodes_id_fk` FOREIGN KEY (`care_episode_id`) REFERENCES `care_episodes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `billing_ledger_entries_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `billing_ledger_entries_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `billing_ledger_entries_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `billing_ledger_entries_service_id_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `care_episodes` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `patient_id` varchar(36) NOT NULL,
  `staff_member_id` varchar(36) DEFAULT NULL,
  `previous_episode_id` varchar(36) DEFAULT NULL,
  `origin` varchar(50) DEFAULT NULL,
  `status` enum('Pendiente','Pagado','Anulado') NOT NULL DEFAULT 'Pendiente',
  `opened_at` timestamp(3) NOT NULL,
  `closed_at` timestamp(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `care_episodes_staff_member_id_staff_members_id_fk` (`staff_member_id`),
  KEY `care_episodes_patient_idx` (`patient_id`,`opened_at`,`deleted_at`),
  KEY `care_episodes_status_idx` (`status`,`deleted_at`),
  CONSTRAINT `care_episodes_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `care_episodes_staff_member_id_staff_members_id_fk` FOREIGN KEY (`staff_member_id`) REFERENCES `staff_members` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `clinical_attachments` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `patient_id` varchar(36) NOT NULL,
  `clinical_encounter_id` varchar(36) DEFAULT NULL,
  `label` varchar(255) NOT NULL,
  `source` enum('in_app_camera','file_upload') NOT NULL,
  `object_path` varchar(512) NOT NULL,
  `mime_type` varchar(127) NOT NULL,
  `size_bytes` int NOT NULL,
  `uploaded_by` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `clinical_attachments_uploaded_by_users_id_fk` (`uploaded_by`),
  KEY `clinical_attachments_patient_idx` (`patient_id`,`deleted_at`),
  KEY `clinical_attachments_encounter_idx` (`clinical_encounter_id`,`deleted_at`),
  CONSTRAINT `attachments_encounter_fk` FOREIGN KEY (`clinical_encounter_id`) REFERENCES `clinical_encounters` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `clinical_attachments_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `clinical_attachments_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `clinical_encounters` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `patient_id` varchar(36) NOT NULL,
  `staff_member_id` varchar(36) NOT NULL,
  `care_episode_id` varchar(36) DEFAULT NULL,
  `invoice_id` varchar(36) DEFAULT NULL,
  `type` enum('outpatient','emergency','hospitalization','operating_room') NOT NULL,
  `occurred_at` timestamp(3) NOT NULL,
  `last_visit_at` timestamp(3) NULL DEFAULT NULL,
  `diagnosis` text,
  `treatment` text,
  `notes` text,
  `family_history` text,
  `habits_history` text,
  `pathological_history` text,
  `surgical_history` text,
  PRIMARY KEY (`id`),
  KEY `clinical_encounters_staff_member_id_staff_members_id_fk` (`staff_member_id`),
  KEY `clinical_encounters_care_episode_id_care_episodes_id_fk` (`care_episode_id`),
  KEY `clinical_encounters_patient_idx` (`patient_id`,`occurred_at`,`deleted_at`),
  KEY `clinical_encounters_type_idx` (`type`,`occurred_at`,`deleted_at`),
  KEY `clinical_encounters_invoice_idx` (`invoice_id`,`deleted_at`),
  CONSTRAINT `clinical_encounters_care_episode_id_care_episodes_id_fk` FOREIGN KEY (`care_episode_id`) REFERENCES `care_episodes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `clinical_encounters_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `clinical_encounters_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `clinical_encounters_staff_member_id_staff_members_id_fk` FOREIGN KEY (`staff_member_id`) REFERENCES `staff_members` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `consent_instances` (
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

CREATE TABLE `consent_template_versions` (
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

CREATE TABLE `consent_templates` (
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

CREATE TABLE `document_deliveries` (
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

CREATE TABLE `emergency_contacts` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `patient_id` varchar(36) NOT NULL,
  `name` varchar(150) NOT NULL,
  `relationship` varchar(80) NOT NULL,
  `phone` varchar(30) NOT NULL,
  `email` varchar(190) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `emergency_contacts_patient_idx` (`patient_id`,`deleted_at`),
  CONSTRAINT `emergency_contacts_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `encounter_products` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `clinical_encounter_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `quantity` int NOT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `encounter_products_encounter_product_unique` (`clinical_encounter_id`,`product_id`),
  KEY `encounter_products_product_idx` (`product_id`,`deleted_at`),
  CONSTRAINT `encounter_products_encounter_fk` FOREIGN KEY (`clinical_encounter_id`) REFERENCES `clinical_encounters` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `encounter_products_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `encounter_services` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `clinical_encounter_id` varchar(36) NOT NULL,
  `service_id` varchar(36) NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `notes` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `encounter_services_encounter_service_unique` (`clinical_encounter_id`,`service_id`),
  KEY `encounter_services_service_idx` (`service_id`,`deleted_at`),
  CONSTRAINT `encounter_services_encounter_fk` FOREIGN KEY (`clinical_encounter_id`) REFERENCES `clinical_encounters` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `encounter_services_service_id_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `encounter_vitals` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `clinical_encounter_id` varchar(36) NOT NULL,
  `blood_pressure` varchar(20) DEFAULT NULL,
  `oxygen_saturation` decimal(5,2) DEFAULT NULL,
  `temperature` decimal(5,2) DEFAULT NULL,
  `blood_glucose` decimal(6,2) DEFAULT NULL,
  `weight` decimal(7,2) DEFAULT NULL,
  `height` decimal(6,2) DEFAULT NULL,
  `body_mass_index` decimal(6,2) DEFAULT NULL,
  `body_fat_percent` decimal(5,2) DEFAULT NULL,
  `visceral_fat` decimal(5,2) DEFAULT NULL,
  `metabolic_age` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `encounter_vitals_encounter_unique` (`clinical_encounter_id`),
  CONSTRAINT `encounter_vitals_clinical_encounter_id_clinical_encounters_id_fk` FOREIGN KEY (`clinical_encounter_id`) REFERENCES `clinical_encounters` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `insurers` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(190) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `discount_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `insurers_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `inventory_batches` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `product_id` varchar(36) NOT NULL,
  `location_id` varchar(36) DEFAULT NULL,
  `batch_number` varchar(100) NOT NULL,
  `quantity` int NOT NULL,
  `received_at` date NOT NULL,
  `expires_at` date DEFAULT NULL,
  `unit_cost` decimal(12,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_batches_product_number_unique` (`product_id`,`batch_number`),
  KEY `inventory_batches_location_id_inventory_locations_id_fk` (`location_id`),
  KEY `inventory_batches_expiry_idx` (`expires_at`,`deleted_at`),
  CONSTRAINT `inventory_batches_location_id_inventory_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inventory_batches_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `inventory_categories` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_categories_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `inventory_locations` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_locations_code_unique` (`code`),
  UNIQUE KEY `inventory_locations_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `inventory_stock` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `product_id` varchar(36) NOT NULL,
  `location_id` varchar(36) NOT NULL,
  `quantity` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_stock_product_location_unique` (`product_id`,`location_id`),
  KEY `inventory_stock_location_idx` (`location_id`,`deleted_at`),
  CONSTRAINT `inventory_stock_location_id_inventory_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `inventory_stock_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `invoice_items` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `invoice_id` varchar(36) NOT NULL,
  `product_id` varchar(36) DEFAULT NULL,
  `service_id` varchar(36) DEFAULT NULL,
  `category` varchar(50) NOT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `unit_price` decimal(12,2) NOT NULL,
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `invoice_items_invoice_idx` (`invoice_id`,`deleted_at`),
  KEY `invoice_items_product_idx` (`product_id`,`deleted_at`),
  KEY `invoice_items_service_idx` (`service_id`,`deleted_at`),
  CONSTRAINT `invoice_items_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `invoice_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoice_items_service_id_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `invoice_number_sequences` (
  `id` varchar(36) NOT NULL,
  `current_number` int NOT NULL,
  `min_number` int NOT NULL,
  `max_number` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `invoices` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `patient_id` varchar(36) DEFAULT NULL,
  `staff_member_id` varchar(36) DEFAULT NULL,
  `care_episode_id` varchar(36) DEFAULT NULL,
  `payment_method_id` varchar(36) DEFAULT NULL,
  `insurer_id` varchar(36) DEFAULT NULL,
  `promotion_id` varchar(36) DEFAULT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `issued_at` timestamp(3) NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` enum('Pendiente','Pagado','Anulado') NOT NULL DEFAULT 'Pendiente',
  `elderly_discount_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `promotion_code` varchar(50) DEFAULT NULL,
  `promotional_discount_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `tax_registration_number` varchar(50) DEFAULT NULL,
  `cai` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoices_number_unique` (`invoice_number`),
  UNIQUE KEY `invoices_care_episode_unique` (`care_episode_id`),
  KEY `invoices_staff_member_id_staff_members_id_fk` (`staff_member_id`),
  KEY `invoices_payment_method_id_payment_methods_id_fk` (`payment_method_id`),
  KEY `invoices_insurer_id_insurers_id_fk` (`insurer_id`),
  KEY `invoices_promotion_id_promotions_id_fk` (`promotion_id`),
  KEY `invoices_patient_idx` (`patient_id`,`issued_at`,`deleted_at`),
  KEY `invoices_status_idx` (`status`,`issued_at`,`deleted_at`),
  CONSTRAINT `invoices_care_episode_id_care_episodes_id_fk` FOREIGN KEY (`care_episode_id`) REFERENCES `care_episodes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoices_insurer_id_insurers_id_fk` FOREIGN KEY (`insurer_id`) REFERENCES `insurers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoices_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoices_payment_method_id_payment_methods_id_fk` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoices_promotion_id_promotions_id_fk` FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoices_staff_member_id_staff_members_id_fk` FOREIGN KEY (`staff_member_id`) REFERENCES `staff_members` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `medical_records` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `clinical_encounter_id` varchar(36) NOT NULL,
  `chief_complaint` text NOT NULL,
  `current_illness` text NOT NULL,
  `physical_exam` text NOT NULL,
  `allergies` text,
  `current_medications` text,
  `follow_up_plan` text,
  `referrals` text,
  `triage_level` varchar(50) DEFAULT NULL,
  `arrival_mode` varchar(100) DEFAULT NULL,
  `pain_scale` int DEFAULT NULL,
  `glasgow_score` int DEFAULT NULL,
  `disposition` varchar(100) DEFAULT NULL,
  `injury_mechanism` text,
  `preoperative_diagnosis` text,
  `postoperative_diagnosis` text,
  `procedure_name` text,
  `anesthesia_type` varchar(100) DEFAULT NULL,
  `surgery_started_at` timestamp(3) NULL DEFAULT NULL,
  `surgery_ended_at` timestamp(3) NULL DEFAULT NULL,
  `findings` text,
  `complications` text,
  `admission_diagnosis` text,
  `admission_reason` text,
  `service_name` varchar(150) DEFAULT NULL,
  `bed_label` varchar(100) DEFAULT NULL,
  `evolution_summary` text,
  `discharge_plan` text,
  `discharged_at` timestamp(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `medical_records_encounter_unique` (`clinical_encounter_id`),
  CONSTRAINT `medical_records_clinical_encounter_id_clinical_encounters_id_fk` FOREIGN KEY (`clinical_encounter_id`) REFERENCES `clinical_encounters` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `operating_room_assignments` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `operating_room_id` varchar(36) NOT NULL,
  `patient_id` varchar(36) NOT NULL,
  `staff_member_id` varchar(36) DEFAULT NULL,
  `care_episode_id` varchar(36) DEFAULT NULL,
  `procedure_name` varchar(255) DEFAULT NULL,
  `anesthesia_type` varchar(100) DEFAULT NULL,
  `scheduled_start_at` timestamp(3) NULL DEFAULT NULL,
  `scheduled_end_at` timestamp(3) NULL DEFAULT NULL,
  `notes` text,
  `assigned_at` timestamp(3) NOT NULL,
  `released_at` timestamp(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `operating_room_assignments_staff_member_id_staff_members_id_fk` (`staff_member_id`),
  KEY `operating_room_assignments_care_episode_id_care_episodes_id_fk` (`care_episode_id`),
  KEY `or_assignments_room_idx` (`operating_room_id`,`released_at`,`deleted_at`),
  KEY `or_assignments_patient_idx` (`patient_id`,`assigned_at`,`deleted_at`),
  CONSTRAINT `operating_room_assignments_care_episode_id_care_episodes_id_fk` FOREIGN KEY (`care_episode_id`) REFERENCES `care_episodes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `operating_room_assignments_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `operating_room_assignments_staff_member_id_staff_members_id_fk` FOREIGN KEY (`staff_member_id`) REFERENCES `staff_members` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `or_assignments_room_fk` FOREIGN KEY (`operating_room_id`) REFERENCES `operating_rooms` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `operating_room_events` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `operating_room_id` varchar(36) NOT NULL,
  `assignment_id` varchar(36) DEFAULT NULL,
  `actor_id` varchar(36) DEFAULT NULL,
  `type` varchar(50) NOT NULL,
  `occurred_at` timestamp(3) NOT NULL,
  `details` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `operating_room_events_actor_id_users_id_fk` (`actor_id`),
  KEY `or_events_assignment_fk` (`assignment_id`),
  KEY `or_events_room_idx` (`operating_room_id`,`occurred_at`,`deleted_at`),
  CONSTRAINT `operating_room_events_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `operating_room_events_operating_room_id_operating_rooms_id_fk` FOREIGN KEY (`operating_room_id`) REFERENCES `operating_rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `or_events_assignment_fk` FOREIGN KEY (`assignment_id`) REFERENCES `operating_room_assignments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `operating_rooms` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `code` varchar(50) NOT NULL,
  `specialty` varchar(100) DEFAULT NULL,
  `status` enum('available','occupied','maintenance','blocked') NOT NULL DEFAULT 'available',
  PRIMARY KEY (`id`),
  UNIQUE KEY `operating_rooms_code_unique` (`code`),
  KEY `operating_rooms_status_idx` (`status`,`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `password_reset_tokens` (
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

CREATE TABLE `patient_images` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `patient_id` varchar(36) NOT NULL,
  `content_type` varchar(127) NOT NULL,
  `data_url` text NOT NULL,
  `size_bytes` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `patient_images_patient_idx` (`patient_id`,`deleted_at`),
  CONSTRAINT `patient_images_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `patient_movements` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `patient_id` varchar(36) NOT NULL,
  `care_episode_id` varchar(36) DEFAULT NULL,
  `actor_id` varchar(36) DEFAULT NULL,
  `from_station` varchar(50) DEFAULT NULL,
  `to_station` varchar(50) NOT NULL,
  `occurred_at` timestamp(3) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `notes` text,
  `source` enum('visit','bed','oroom','manual') NOT NULL,
  `clinical_encounter_id` varchar(36) DEFAULT NULL,
  `bed_id` varchar(36) DEFAULT NULL,
  `operating_room_id` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `patient_movements_actor_id_users_id_fk` (`actor_id`),
  KEY `patient_movements_patient_idx` (`patient_id`,`occurred_at`,`deleted_at`),
  KEY `patient_movements_episode_idx` (`care_episode_id`,`occurred_at`,`deleted_at`),
  CONSTRAINT `patient_movements_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `patient_movements_care_episode_id_care_episodes_id_fk` FOREIGN KEY (`care_episode_id`) REFERENCES `care_episodes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `patient_movements_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `patients` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `birth_date` date DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(190) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `identification` varchar(50) DEFAULT NULL,
  `gender` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `patients_identification_unique` (`identification`),
  KEY `patients_name_idx` (`first_name`,`last_name`),
  KEY `patients_email_idx` (`email`),
  KEY `patients_deleted_idx` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `payment_methods` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `code` varchar(50) NOT NULL,
  `description` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_methods_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `permission_audit_logs` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `actor_id` varchar(36) DEFAULT NULL,
  `target_type` enum('role','user') NOT NULL,
  `target_id` varchar(100) NOT NULL,
  `grants` json NOT NULL,
  `revokes` json NOT NULL,
  PRIMARY KEY (`id`),
  KEY `permission_audit_target_idx` (`target_type`,`target_id`,`created_at`),
  KEY `permission_audit_actor_idx` (`actor_id`,`created_at`),
  CONSTRAINT `permission_audit_logs_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `permissions` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `key` varchar(100) NOT NULL,
  `description` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `products` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `category_id` varchar(36) DEFAULT NULL,
  `supplier_id` varchar(36) DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `description` text,
  `barcode` varchar(100) DEFAULT NULL,
  `unit_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `minimum_stock` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `products_barcode_unique` (`barcode`),
  KEY `products_supplier_id_suppliers_id_fk` (`supplier_id`),
  KEY `products_name_idx` (`name`,`deleted_at`),
  KEY `products_category_idx` (`category_id`,`deleted_at`),
  CONSTRAINT `products_category_id_inventory_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `inventory_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `products_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `promotions` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `code` varchar(50) NOT NULL,
  `description` text,
  `discount_percent` decimal(5,2) NOT NULL,
  `starts_at` timestamp NULL DEFAULT NULL,
  `ends_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `promotions_code_unique` (`code`),
  KEY `promotions_period_idx` (`starts_at`,`ends_at`,`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `purchase_items` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `purchase_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `batch_id` varchar(36) DEFAULT NULL,
  `quantity` int NOT NULL,
  `unit_cost` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_items_batch_id_inventory_batches_id_fk` (`batch_id`),
  KEY `purchase_items_purchase_idx` (`purchase_id`,`deleted_at`),
  KEY `purchase_items_product_idx` (`product_id`,`deleted_at`),
  CONSTRAINT `purchase_items_batch_id_inventory_batches_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `inventory_batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `purchase_items_purchase_id_purchases_id_fk` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `purchases` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `supplier_id` varchar(36) DEFAULT NULL,
  `payment_method_id` varchar(36) DEFAULT NULL,
  `purchased_at` timestamp NOT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `purchases_supplier_id_suppliers_id_fk` (`supplier_id`),
  KEY `purchases_payment_method_id_payment_methods_id_fk` (`payment_method_id`),
  KEY `purchases_date_idx` (`purchased_at`,`deleted_at`),
  CONSTRAINT `purchases_payment_method_id_payment_methods_id_fk` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchases_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `resource_types` (
  `id` varchar(36) NOT NULL,
  `code` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `resource_types_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `role_permissions` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `role_id` varchar(36) NOT NULL,
  `permission_id` varchar(36) NOT NULL,
  `effect` enum('grant','revoke') NOT NULL DEFAULT 'grant',
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_permissions_role_permission_unique` (`role_id`,`permission_id`),
  KEY `role_permissions_permission_idx` (`permission_id`,`deleted_at`),
  CONSTRAINT `role_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `role_permissions_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `roles` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `key` varchar(50) NOT NULL,
  `description` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_unique` (`name`),
  UNIQUE KEY `roles_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `services` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `description` text,
  `price` decimal(12,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `services_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `staff_members` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `position` varchar(100) DEFAULT NULL,
  `specialty` varchar(100) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(190) DEFAULT NULL,
  `hired_at` date DEFAULT NULL,
  `google_calendar_id` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `staff_members_user_unique` (`user_id`),
  KEY `staff_members_name_idx` (`first_name`,`last_name`),
  KEY `staff_members_active_idx` (`is_active`,`deleted_at`),
  CONSTRAINT `staff_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `stock_movements` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `product_id` varchar(36) NOT NULL,
  `from_location_id` varchar(36) DEFAULT NULL,
  `to_location_id` varchar(36) DEFAULT NULL,
  `clinical_encounter_id` varchar(36) DEFAULT NULL,
  `purchase_item_id` varchar(36) DEFAULT NULL,
  `actor_id` varchar(36) DEFAULT NULL,
  `type` enum('purchase','transfer','consumption','adjustment','return') NOT NULL,
  `quantity` int NOT NULL,
  `occurred_at` timestamp(3) NOT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `stock_movements_from_location_id_inventory_locations_id_fk` (`from_location_id`),
  KEY `stock_movements_to_location_id_inventory_locations_id_fk` (`to_location_id`),
  KEY `stock_movements_purchase_item_id_purchase_items_id_fk` (`purchase_item_id`),
  KEY `stock_movements_actor_id_users_id_fk` (`actor_id`),
  KEY `stock_movements_product_idx` (`product_id`,`occurred_at`,`deleted_at`),
  KEY `stock_movements_encounter_idx` (`clinical_encounter_id`,`deleted_at`),
  CONSTRAINT `stock_movements_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_clinical_encounter_id_clinical_encounters_id_fk` FOREIGN KEY (`clinical_encounter_id`) REFERENCES `clinical_encounters` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_from_location_id_inventory_locations_id_fk` FOREIGN KEY (`from_location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_purchase_item_id_purchase_items_id_fk` FOREIGN KEY (`purchase_item_id`) REFERENCES `purchase_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_to_location_id_inventory_locations_id_fk` FOREIGN KEY (`to_location_id`) REFERENCES `inventory_locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `suppliers` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `contact_name` varchar(150) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(190) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `suppliers_name_idx` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_permissions` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `user_id` varchar(36) NOT NULL,
  `permission_id` varchar(36) NOT NULL,
  `effect` enum('grant','revoke') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_permissions_user_permission_unique` (`user_id`,`permission_id`),
  KEY `user_permissions_permission_idx` (`permission_id`,`deleted_at`),
  CONSTRAINT `user_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_permissions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_profiles` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `user_id` varchar(36) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `identification` varchar(50) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `theme` enum('light','dark') NOT NULL DEFAULT 'light',
  `avatar_data_url` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_profiles_user_unique` (`user_id`),
  CONSTRAINT `user_profiles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `role_id` varchar(36) NOT NULL,
  `name` varchar(150) NOT NULL,
  `email` varchar(190) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `firebase_id` varchar(190) DEFAULT NULL,
  `provider` enum('conventional','google') NOT NULL DEFAULT 'conventional',
  `access_token` text,
  `session_version` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_firebase_id_unique` (`firebase_id`),
  KEY `users_role_idx` (`role_id`,`deleted_at`),
  KEY `users_active_idx` (`is_active`,`deleted_at`),
  CONSTRAINT `users_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
