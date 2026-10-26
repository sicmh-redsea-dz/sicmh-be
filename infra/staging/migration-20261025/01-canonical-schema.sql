SET NAMES utf8mb4;
USE medit_global;
CREATE TEMPORARY TABLE medit_qa_guard (ok TINYINT NOT NULL CHECK(ok=1));
INSERT INTO medit_qa_guard SELECT COUNT(*)=1 FROM medit_global.companies WHERE code='MEDITQA' AND database_name='sicmh' AND is_active=1;
CREATE DATABASE medit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medit;
CREATE TABLE __drizzle_migrations (id SERIAL PRIMARY KEY, hash TEXT NOT NULL, created_at BIGINT);
CREATE TABLE `appointment_sources` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`code` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	CONSTRAINT `appointment_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `appointment_sources_code_unique` UNIQUE(`code`)
);
CREATE TABLE `appointment_statuses` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`code` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	CONSTRAINT `appointment_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `appointment_statuses_code_unique` UNIQUE(`code`)
);
CREATE TABLE `appointment_types` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`code` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(10) NOT NULL DEFAULT '#6B7280',
	CONSTRAINT `appointment_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `appointment_types_code_unique` UNIQUE(`code`)
);
CREATE TABLE `appointments` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`type_id` varchar(36) NOT NULL,
	`status_id` varchar(36) NOT NULL,
	`source_id` varchar(36) NOT NULL,
	`staff_member_id` varchar(36),
	`patient_id` varchar(36),
	`bed_id` varchar(36),
	`operating_room_id` varchar(36),
	`created_by` varchar(36),
	`title` varchar(200) NOT NULL,
	`description` text,
	`starts_at` timestamp(3) NOT NULL,
	`ends_at` timestamp(3) NOT NULL,
	`patient_name` varchar(200),
	`external_id` varchar(255),
	`chatbot_session_id` varchar(255),
	`notes` text,
	`google_calendar_event_id` varchar(255),
	`google_calendar_synced_at` timestamp(3),
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`),
	CONSTRAINT `appointments_google_event_unique` UNIQUE(`google_calendar_event_id`)
);
CREATE TABLE `bed_assignments` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`bed_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`staff_member_id` varchar(36),
	`care_episode_id` varchar(36),
	`reason` varchar(255),
	`notes` text,
	`expected_discharge_at` timestamp(3),
	`assigned_at` timestamp(3) NOT NULL,
	`released_at` timestamp(3),
	CONSTRAINT `bed_assignments_id` PRIMARY KEY(`id`)
);
CREATE TABLE `bed_events` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`bed_id` varchar(36) NOT NULL,
	`assignment_id` varchar(36),
	`actor_id` varchar(36),
	`type` varchar(50) NOT NULL,
	`occurred_at` timestamp(3) NOT NULL,
	`details` json,
	CONSTRAINT `bed_events_id` PRIMARY KEY(`id`)
);
CREATE TABLE `beds` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`code` varchar(50) NOT NULL,
	`module` enum('hospitalization','emergency') NOT NULL,
	`area` varchar(100),
	`status` enum('available','occupied','maintenance','blocked') NOT NULL DEFAULT 'available',
	CONSTRAINT `beds_id` PRIMARY KEY(`id`),
	CONSTRAINT `beds_module_code_unique` UNIQUE(`module`,`code`)
);
CREATE TABLE `billing_ledger_entries` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`patient_id` varchar(36) NOT NULL,
	`care_episode_id` varchar(36),
	`invoice_id` varchar(36),
	`product_id` varchar(36),
	`service_id` varchar(36),
	`movement_id` varchar(36),
	`station` varchar(50),
	`category` varchar(50) NOT NULL,
	`description` varchar(255) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit_price` decimal(12,2) NOT NULL,
	`total_amount` decimal(12,2) NOT NULL,
	`occurred_at` timestamp(3) NOT NULL,
	`status` enum('Pagado','Pendiente','Anulado') NOT NULL,
	`source` enum('invoice','stock','manual','movement') NOT NULL,
	CONSTRAINT `billing_ledger_entries_id` PRIMARY KEY(`id`)
);
CREATE TABLE `care_episodes` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`patient_id` varchar(36) NOT NULL,
	`staff_member_id` varchar(36),
	`previous_episode_id` varchar(36),
	`origin` varchar(50),
	`status` enum('Pendiente','Pagado','Anulado') NOT NULL DEFAULT 'Pendiente',
	`opened_at` timestamp(3) NOT NULL,
	`closed_at` timestamp(3),
	CONSTRAINT `care_episodes_id` PRIMARY KEY(`id`)
);
CREATE TABLE `attachment_access_logs` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`attachment_id` varchar(36) NOT NULL,
	`accessed_by` varchar(36),
	`accessed_at` timestamp(3) NOT NULL,
	`ip_address` varchar(45),
	CONSTRAINT `attachment_access_logs_id` PRIMARY KEY(`id`)
);
CREATE TABLE `clinical_attachments` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`patient_id` varchar(36) NOT NULL,
	`clinical_encounter_id` varchar(36),
	`label` varchar(255) NOT NULL,
	`source` enum('in_app_camera','file_upload') NOT NULL,
	`object_path` varchar(512) NOT NULL,
	`mime_type` varchar(127) NOT NULL,
	`size_bytes` int NOT NULL,
	`uploaded_by` varchar(36) NOT NULL,
	CONSTRAINT `clinical_attachments_id` PRIMARY KEY(`id`)
);
CREATE TABLE `clinical_encounters` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`patient_id` varchar(36) NOT NULL,
	`staff_member_id` varchar(36) NOT NULL,
	`care_episode_id` varchar(36),
	`invoice_id` varchar(36),
	`type` enum('outpatient','emergency','hospitalization','operating_room') NOT NULL,
	`occurred_at` timestamp(3) NOT NULL,
	`last_visit_at` timestamp(3),
	`diagnosis` text,
	`treatment` text,
	`notes` text,
	`family_history` text,
	`habits_history` text,
	`pathological_history` text,
	`surgical_history` text,
	CONSTRAINT `clinical_encounters_id` PRIMARY KEY(`id`)
);
CREATE TABLE `emergency_contacts` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`patient_id` varchar(36) NOT NULL,
	`name` varchar(150) NOT NULL,
	`relationship` varchar(80) NOT NULL,
	`phone` varchar(30) NOT NULL,
	`email` varchar(190),
	`address` varchar(500),
	`is_primary` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `emergency_contacts_id` PRIMARY KEY(`id`)
);
CREATE TABLE `encounter_products` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`clinical_encounter_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`quantity` int NOT NULL,
	`notes` text,
	CONSTRAINT `encounter_products_id` PRIMARY KEY(`id`),
	CONSTRAINT `encounter_products_encounter_product_unique` UNIQUE(`clinical_encounter_id`,`product_id`)
);
CREATE TABLE `encounter_services` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`clinical_encounter_id` varchar(36) NOT NULL,
	`service_id` varchar(36) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`notes` text,
	CONSTRAINT `encounter_services_id` PRIMARY KEY(`id`),
	CONSTRAINT `encounter_services_encounter_service_unique` UNIQUE(`clinical_encounter_id`,`service_id`)
);
CREATE TABLE `encounter_vitals` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`clinical_encounter_id` varchar(36) NOT NULL,
	`blood_pressure` varchar(20),
	`oxygen_saturation` decimal(5,2),
	`temperature` decimal(5,2),
	`blood_glucose` decimal(6,2),
	`weight` decimal(7,2),
	`height` decimal(6,2),
	`body_mass_index` decimal(6,2),
	`body_fat_percent` decimal(5,2),
	`visceral_fat` decimal(5,2),
	`metabolic_age` int,
	CONSTRAINT `encounter_vitals_id` PRIMARY KEY(`id`),
	CONSTRAINT `encounter_vitals_encounter_unique` UNIQUE(`clinical_encounter_id`)
);
CREATE TABLE `insurers` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`name` varchar(150) NOT NULL,
	`phone` varchar(30),
	`email` varchar(190),
	`address` varchar(500),
	`discount_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
	CONSTRAINT `insurers_id` PRIMARY KEY(`id`),
	CONSTRAINT `insurers_name_unique` UNIQUE(`name`)
);
CREATE TABLE `inventory_batches` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`product_id` varchar(36) NOT NULL,
	`location_id` varchar(36),
	`batch_number` varchar(100) NOT NULL,
	`quantity` int NOT NULL,
	`received_at` date NOT NULL,
	`expires_at` date,
	`unit_cost` decimal(12,2),
	CONSTRAINT `inventory_batches_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_batches_product_number_unique` UNIQUE(`product_id`,`batch_number`)
);
CREATE TABLE `inventory_categories` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`name` varchar(100) NOT NULL,
	`description` text,
	CONSTRAINT `inventory_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_categories_name_unique` UNIQUE(`name`)
);
CREATE TABLE `inventory_locations` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`code` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	CONSTRAINT `inventory_locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_locations_code_unique` UNIQUE(`code`),
	CONSTRAINT `inventory_locations_name_unique` UNIQUE(`name`)
);
CREATE TABLE `inventory_stock` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`product_id` varchar(36) NOT NULL,
	`location_id` varchar(36) NOT NULL,
	`quantity` int NOT NULL DEFAULT 0,
	CONSTRAINT `inventory_stock_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_stock_product_location_unique` UNIQUE(`product_id`,`location_id`)
);
CREATE TABLE `invoice_items` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`invoice_id` varchar(36) NOT NULL,
	`product_id` varchar(36),
	`service_id` varchar(36),
	`category` varchar(50) NOT NULL,
	`description` varchar(255) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit_price` decimal(12,2) NOT NULL,
	`discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`total_amount` decimal(12,2) NOT NULL,
	CONSTRAINT `invoice_items_id` PRIMARY KEY(`id`)
);
CREATE TABLE `invoices` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`patient_id` varchar(36),
	`staff_member_id` varchar(36),
	`care_episode_id` varchar(36),
	`payment_method_id` varchar(36),
	`insurer_id` varchar(36),
	`promotion_id` varchar(36),
	`invoice_number` varchar(50) NOT NULL,
	`issued_at` timestamp(3) NOT NULL,
	`amount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`status` enum('Pendiente','Pagado','Anulado') NOT NULL DEFAULT 'Pendiente',
	`elderly_discount_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
	`promotion_code` varchar(50),
	`promotional_discount_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
	`tax_registration_number` varchar(50),
	`cai` varchar(100),
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_number_unique` UNIQUE(`invoice_number`),
	CONSTRAINT `invoices_care_episode_unique` UNIQUE(`care_episode_id`)
);
CREATE TABLE `medical_records` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`clinical_encounter_id` varchar(36) NOT NULL,
	`chief_complaint` text NOT NULL,
	`current_illness` text NOT NULL,
	`physical_exam` text NOT NULL,
	`allergies` text,
	`current_medications` text,
	`follow_up_plan` text,
	`referrals` text,
	`triage_level` varchar(50),
	`arrival_mode` varchar(100),
	`pain_scale` int,
	`glasgow_score` int,
	`disposition` varchar(100),
	`injury_mechanism` text,
	`preoperative_diagnosis` text,
	`postoperative_diagnosis` text,
	`procedure_name` text,
	`anesthesia_type` varchar(100),
	`surgery_started_at` timestamp(3),
	`surgery_ended_at` timestamp(3),
	`findings` text,
	`complications` text,
	`admission_diagnosis` text,
	`admission_reason` text,
	`service_name` varchar(150),
	`bed_label` varchar(100),
	`evolution_summary` text,
	`discharge_plan` text,
	`discharged_at` timestamp(3),
	CONSTRAINT `medical_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `medical_records_encounter_unique` UNIQUE(`clinical_encounter_id`)
);
CREATE TABLE `operating_room_assignments` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`operating_room_id` varchar(36) NOT NULL,
	`patient_id` varchar(36) NOT NULL,
	`staff_member_id` varchar(36),
	`care_episode_id` varchar(36),
	`procedure_name` varchar(255),
	`anesthesia_type` varchar(100),
	`scheduled_start_at` timestamp(3),
	`scheduled_end_at` timestamp(3),
	`notes` text,
	`assigned_at` timestamp(3) NOT NULL,
	`released_at` timestamp(3),
	CONSTRAINT `operating_room_assignments_id` PRIMARY KEY(`id`)
);
CREATE TABLE `operating_room_events` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`operating_room_id` varchar(36) NOT NULL,
	`assignment_id` varchar(36),
	`actor_id` varchar(36),
	`type` varchar(50) NOT NULL,
	`occurred_at` timestamp(3) NOT NULL,
	`details` json,
	CONSTRAINT `operating_room_events_id` PRIMARY KEY(`id`)
);
CREATE TABLE `operating_rooms` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`code` varchar(50) NOT NULL,
	`specialty` varchar(100),
	`status` enum('available','occupied','maintenance','blocked') NOT NULL DEFAULT 'available',
	CONSTRAINT `operating_rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `operating_rooms_code_unique` UNIQUE(`code`)
);
CREATE TABLE `patient_images` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`patient_id` varchar(36) NOT NULL,
	`content_type` varchar(127) NOT NULL,
	`data_url` text NOT NULL,
	`size_bytes` int NOT NULL,
	CONSTRAINT `patient_images_id` PRIMARY KEY(`id`)
);
CREATE TABLE `patient_movements` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`patient_id` varchar(36) NOT NULL,
	`care_episode_id` varchar(36),
	`actor_id` varchar(36),
	`from_station` varchar(50),
	`to_station` varchar(50) NOT NULL,
	`occurred_at` timestamp(3) NOT NULL,
	`reason` varchar(255),
	`notes` text,
	`source` enum('visit','bed','oroom','manual') NOT NULL,
	`clinical_encounter_id` varchar(36),
	`bed_id` varchar(36),
	`operating_room_id` varchar(36),
	CONSTRAINT `patient_movements_id` PRIMARY KEY(`id`)
);
CREATE TABLE `patients` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`birth_date` date,
	`phone` varchar(30),
	`email` varchar(190),
	`address` varchar(500),
	`identification` varchar(50),
	`gender` varchar(30),
	CONSTRAINT `patients_id` PRIMARY KEY(`id`),
	CONSTRAINT `patients_identification_unique` UNIQUE(`identification`)
);
CREATE TABLE `payment_methods` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`code` varchar(50) NOT NULL,
	`description` varchar(100) NOT NULL,
	CONSTRAINT `payment_methods_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_methods_code_unique` UNIQUE(`code`)
);
CREATE TABLE `permission_audit_logs` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`actor_id` varchar(36),
	`target_type` enum('role','user') NOT NULL,
	`target_id` varchar(100) NOT NULL,
	`grants` json NOT NULL,
	`revokes` json NOT NULL,
	CONSTRAINT `permission_audit_logs_id` PRIMARY KEY(`id`)
);
CREATE TABLE `permissions` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`key` varchar(100) NOT NULL,
	`description` text,
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_key_unique` UNIQUE(`key`)
);
CREATE TABLE `products` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`category_id` varchar(36),
	`supplier_id` varchar(36),
	`name` varchar(150) NOT NULL,
	`description` text,
	`barcode` varchar(100),
	`unit_price` decimal(12,2) NOT NULL DEFAULT '0.00',
	`minimum_stock` int NOT NULL DEFAULT 0,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_barcode_unique` UNIQUE(`barcode`)
);
CREATE TABLE `promotions` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`code` varchar(50) NOT NULL,
	`description` text,
	`discount_percent` decimal(5,2) NOT NULL,
	`starts_at` timestamp,
	`ends_at` timestamp,
	CONSTRAINT `promotions_id` PRIMARY KEY(`id`),
	CONSTRAINT `promotions_code_unique` UNIQUE(`code`)
);
CREATE TABLE `purchase_items` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`purchase_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`batch_id` varchar(36),
	`quantity` int NOT NULL,
	`unit_cost` decimal(12,2) NOT NULL,
	CONSTRAINT `purchase_items_id` PRIMARY KEY(`id`)
);
CREATE TABLE `purchases` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`supplier_id` varchar(36),
	`payment_method_id` varchar(36),
	`purchased_at` timestamp NOT NULL,
	`total_amount` decimal(12,2) NOT NULL,
	`notes` text,
	CONSTRAINT `purchases_id` PRIMARY KEY(`id`)
);
CREATE TABLE `role_permissions` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`role_id` varchar(36) NOT NULL,
	`permission_id` varchar(36) NOT NULL,
	`effect` enum('grant','revoke') NOT NULL DEFAULT 'grant',
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_permissions_role_permission_unique` UNIQUE(`role_id`,`permission_id`)
);
CREATE TABLE `roles` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`name` varchar(100) NOT NULL,
	`key` varchar(50) NOT NULL,
	`description` text,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_name_unique` UNIQUE(`name`),
	CONSTRAINT `roles_key_unique` UNIQUE(`key`)
);
CREATE TABLE `services` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`name` varchar(150) NOT NULL,
	`description` text,
	`price` decimal(12,2) NOT NULL DEFAULT '0.00',
	CONSTRAINT `services_id` PRIMARY KEY(`id`),
	CONSTRAINT `services_name_unique` UNIQUE(`name`)
);
CREATE TABLE `staff_members` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`user_id` varchar(36),
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`position` varchar(100),
	`specialty` varchar(100),
	`phone` varchar(30),
	`email` varchar(190),
	`hired_at` date,
	`google_calendar_id` varchar(255),
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `staff_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_members_user_unique` UNIQUE(`user_id`)
);
CREATE TABLE `stock_movements` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`product_id` varchar(36) NOT NULL,
	`from_location_id` varchar(36),
	`to_location_id` varchar(36),
	`clinical_encounter_id` varchar(36),
	`purchase_item_id` varchar(36),
	`actor_id` varchar(36),
	`type` enum('purchase','transfer','consumption','adjustment','return') NOT NULL,
	`quantity` int NOT NULL,
	`occurred_at` timestamp(3) NOT NULL,
	`notes` text,
	CONSTRAINT `stock_movements_id` PRIMARY KEY(`id`)
);
CREATE TABLE `suppliers` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`name` varchar(150) NOT NULL,
	`contact_name` varchar(150),
	`phone` varchar(30),
	`email` varchar(190),
	`address` varchar(500),
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
CREATE TABLE `user_permissions` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`user_id` varchar(36) NOT NULL,
	`permission_id` varchar(36) NOT NULL,
	`effect` enum('grant','revoke') NOT NULL,
	CONSTRAINT `user_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_permissions_user_permission_unique` UNIQUE(`user_id`,`permission_id`)
);
CREATE TABLE `user_profiles` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`user_id` varchar(36) NOT NULL,
	`phone` varchar(30),
	`identification` varchar(50),
	`department` varchar(100),
	`position` varchar(100),
	`theme` enum('light','dark') NOT NULL DEFAULT 'light',
	`avatar_data_url` text,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_profiles_user_unique` UNIQUE(`user_id`)
);
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`role_id` varchar(36) NOT NULL,
	`name` varchar(150) NOT NULL,
	`email` varchar(190) NOT NULL,
	`password_hash` varchar(255),
	`firebase_id` varchar(190),
	`provider` enum('conventional','google') NOT NULL DEFAULT 'conventional',
	`access_token` text,
	`session_version` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_firebase_id_unique` UNIQUE(`firebase_id`)
);
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_type_id_appointment_types_id_fk` FOREIGN KEY (`type_id`) REFERENCES `appointment_types`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_status_id_appointment_statuses_id_fk` FOREIGN KEY (`status_id`) REFERENCES `appointment_statuses`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_source_id_appointment_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `appointment_sources`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_staff_member_id_staff_members_id_fk` FOREIGN KEY (`staff_member_id`) REFERENCES `staff_members`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_bed_id_beds_id_fk` FOREIGN KEY (`bed_id`) REFERENCES `beds`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_operating_room_id_operating_rooms_id_fk` FOREIGN KEY (`operating_room_id`) REFERENCES `operating_rooms`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `bed_assignments` ADD CONSTRAINT `bed_assignments_bed_id_beds_id_fk` FOREIGN KEY (`bed_id`) REFERENCES `beds`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `bed_assignments` ADD CONSTRAINT `bed_assignments_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `bed_assignments` ADD CONSTRAINT `bed_assignments_staff_member_id_staff_members_id_fk` FOREIGN KEY (`staff_member_id`) REFERENCES `staff_members`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `bed_assignments` ADD CONSTRAINT `bed_assignments_care_episode_id_care_episodes_id_fk` FOREIGN KEY (`care_episode_id`) REFERENCES `care_episodes`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `bed_events` ADD CONSTRAINT `bed_events_bed_id_beds_id_fk` FOREIGN KEY (`bed_id`) REFERENCES `beds`(`id`) ON DELETE cascade ON UPDATE cascade;
ALTER TABLE `bed_events` ADD CONSTRAINT `bed_events_assignment_id_bed_assignments_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `bed_assignments`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `bed_events` ADD CONSTRAINT `bed_events_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `billing_ledger_entries` ADD CONSTRAINT `billing_ledger_entries_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `billing_ledger_entries` ADD CONSTRAINT `billing_ledger_entries_care_episode_id_care_episodes_id_fk` FOREIGN KEY (`care_episode_id`) REFERENCES `care_episodes`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `billing_ledger_entries` ADD CONSTRAINT `billing_ledger_entries_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `billing_ledger_entries` ADD CONSTRAINT `billing_ledger_entries_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `billing_ledger_entries` ADD CONSTRAINT `billing_ledger_entries_service_id_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `care_episodes` ADD CONSTRAINT `care_episodes_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `care_episodes` ADD CONSTRAINT `care_episodes_staff_member_id_staff_members_id_fk` FOREIGN KEY (`staff_member_id`) REFERENCES `staff_members`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `attachment_access_logs` ADD CONSTRAINT `attachment_access_logs_attachment_id_clinical_attachments_id_fk` FOREIGN KEY (`attachment_id`) REFERENCES `clinical_attachments`(`id`) ON DELETE cascade ON UPDATE cascade;
ALTER TABLE `attachment_access_logs` ADD CONSTRAINT `attachment_access_logs_accessed_by_users_id_fk` FOREIGN KEY (`accessed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `clinical_attachments` ADD CONSTRAINT `clinical_attachments_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `clinical_attachments` ADD CONSTRAINT `clinical_attachments_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `clinical_attachments` ADD CONSTRAINT `attachments_encounter_fk` FOREIGN KEY (`clinical_encounter_id`) REFERENCES `clinical_encounters`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `clinical_encounters` ADD CONSTRAINT `clinical_encounters_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `clinical_encounters` ADD CONSTRAINT `clinical_encounters_staff_member_id_staff_members_id_fk` FOREIGN KEY (`staff_member_id`) REFERENCES `staff_members`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `clinical_encounters` ADD CONSTRAINT `clinical_encounters_care_episode_id_care_episodes_id_fk` FOREIGN KEY (`care_episode_id`) REFERENCES `care_episodes`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `clinical_encounters` ADD CONSTRAINT `clinical_encounters_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `emergency_contacts` ADD CONSTRAINT `emergency_contacts_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE cascade;
ALTER TABLE `encounter_products` ADD CONSTRAINT `encounter_products_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `encounter_products` ADD CONSTRAINT `encounter_products_encounter_fk` FOREIGN KEY (`clinical_encounter_id`) REFERENCES `clinical_encounters`(`id`) ON DELETE cascade ON UPDATE cascade;
ALTER TABLE `encounter_services` ADD CONSTRAINT `encounter_services_service_id_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `encounter_services` ADD CONSTRAINT `encounter_services_encounter_fk` FOREIGN KEY (`clinical_encounter_id`) REFERENCES `clinical_encounters`(`id`) ON DELETE cascade ON UPDATE cascade;
ALTER TABLE `encounter_vitals` ADD CONSTRAINT `encounter_vitals_clinical_encounter_id_clinical_encounters_id_fk` FOREIGN KEY (`clinical_encounter_id`) REFERENCES `clinical_encounters`(`id`) ON DELETE cascade ON UPDATE cascade;
ALTER TABLE `inventory_batches` ADD CONSTRAINT `inventory_batches_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE cascade;
ALTER TABLE `inventory_batches` ADD CONSTRAINT `inventory_batches_location_id_inventory_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `inventory_locations`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `inventory_stock` ADD CONSTRAINT `inventory_stock_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE cascade;
ALTER TABLE `inventory_stock` ADD CONSTRAINT `inventory_stock_location_id_inventory_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `inventory_locations`(`id`) ON DELETE cascade ON UPDATE cascade;
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE cascade ON UPDATE cascade;
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_service_id_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_staff_member_id_staff_members_id_fk` FOREIGN KEY (`staff_member_id`) REFERENCES `staff_members`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_care_episode_id_care_episodes_id_fk` FOREIGN KEY (`care_episode_id`) REFERENCES `care_episodes`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_payment_method_id_payment_methods_id_fk` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_insurer_id_insurers_id_fk` FOREIGN KEY (`insurer_id`) REFERENCES `insurers`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_promotion_id_promotions_id_fk` FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `medical_records` ADD CONSTRAINT `medical_records_clinical_encounter_id_clinical_encounters_id_fk` FOREIGN KEY (`clinical_encounter_id`) REFERENCES `clinical_encounters`(`id`) ON DELETE cascade ON UPDATE cascade;
ALTER TABLE `operating_room_assignments` ADD CONSTRAINT `operating_room_assignments_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `operating_room_assignments` ADD CONSTRAINT `operating_room_assignments_staff_member_id_staff_members_id_fk` FOREIGN KEY (`staff_member_id`) REFERENCES `staff_members`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `operating_room_assignments` ADD CONSTRAINT `operating_room_assignments_care_episode_id_care_episodes_id_fk` FOREIGN KEY (`care_episode_id`) REFERENCES `care_episodes`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `operating_room_assignments` ADD CONSTRAINT `or_assignments_room_fk` FOREIGN KEY (`operating_room_id`) REFERENCES `operating_rooms`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `operating_room_events` ADD CONSTRAINT `operating_room_events_operating_room_id_operating_rooms_id_fk` FOREIGN KEY (`operating_room_id`) REFERENCES `operating_rooms`(`id`) ON DELETE cascade ON UPDATE cascade;
ALTER TABLE `operating_room_events` ADD CONSTRAINT `operating_room_events_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `operating_room_events` ADD CONSTRAINT `or_events_assignment_fk` FOREIGN KEY (`assignment_id`) REFERENCES `operating_room_assignments`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `patient_images` ADD CONSTRAINT `patient_images_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE cascade;
ALTER TABLE `patient_movements` ADD CONSTRAINT `patient_movements_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `patient_movements` ADD CONSTRAINT `patient_movements_care_episode_id_care_episodes_id_fk` FOREIGN KEY (`care_episode_id`) REFERENCES `care_episodes`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `patient_movements` ADD CONSTRAINT `patient_movements_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `permission_audit_logs` ADD CONSTRAINT `permission_audit_logs_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_inventory_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `inventory_categories`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `products` ADD CONSTRAINT `products_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_purchase_id_purchases_id_fk` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE cascade ON UPDATE cascade;
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_batch_id_inventory_batches_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `inventory_batches`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_payment_method_id_payment_methods_id_fk` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE cascade;
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE cascade ON UPDATE cascade;
ALTER TABLE `staff_members` ADD CONSTRAINT `staff_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_from_location_id_inventory_locations_id_fk` FOREIGN KEY (`from_location_id`) REFERENCES `inventory_locations`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_to_location_id_inventory_locations_id_fk` FOREIGN KEY (`to_location_id`) REFERENCES `inventory_locations`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_clinical_encounter_id_clinical_encounters_id_fk` FOREIGN KEY (`clinical_encounter_id`) REFERENCES `clinical_encounters`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_purchase_item_id_purchase_items_id_fk` FOREIGN KEY (`purchase_item_id`) REFERENCES `purchase_items`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE cascade ON UPDATE cascade;
ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE restrict ON UPDATE cascade;
CREATE INDEX `appointments_period_idx` ON `appointments` (`starts_at`,`ends_at`,`deleted_at`);
CREATE INDEX `appointments_staff_period_idx` ON `appointments` (`staff_member_id`,`starts_at`,`ends_at`,`deleted_at`);
CREATE INDEX `appointments_patient_idx` ON `appointments` (`patient_id`,`starts_at`,`deleted_at`);
CREATE INDEX `bed_assignments_bed_idx` ON `bed_assignments` (`bed_id`,`released_at`,`deleted_at`);
CREATE INDEX `bed_assignments_patient_idx` ON `bed_assignments` (`patient_id`,`assigned_at`,`deleted_at`);
CREATE INDEX `bed_events_bed_idx` ON `bed_events` (`bed_id`,`occurred_at`,`deleted_at`);
CREATE INDEX `beds_status_idx` ON `beds` (`module`,`status`,`deleted_at`);
CREATE INDEX `billing_ledger_patient_idx` ON `billing_ledger_entries` (`patient_id`,`occurred_at`,`deleted_at`);
CREATE INDEX `billing_ledger_invoice_idx` ON `billing_ledger_entries` (`invoice_id`,`deleted_at`);
CREATE INDEX `billing_ledger_episode_idx` ON `billing_ledger_entries` (`care_episode_id`,`deleted_at`);
CREATE INDEX `care_episodes_patient_idx` ON `care_episodes` (`patient_id`,`opened_at`,`deleted_at`);
CREATE INDEX `care_episodes_status_idx` ON `care_episodes` (`status`,`deleted_at`);
CREATE INDEX `attachment_access_attachment_idx` ON `attachment_access_logs` (`attachment_id`,`accessed_at`);
CREATE INDEX `clinical_attachments_patient_idx` ON `clinical_attachments` (`patient_id`,`deleted_at`);
CREATE INDEX `clinical_attachments_encounter_idx` ON `clinical_attachments` (`clinical_encounter_id`,`deleted_at`);
CREATE INDEX `clinical_encounters_patient_idx` ON `clinical_encounters` (`patient_id`,`occurred_at`,`deleted_at`);
CREATE INDEX `clinical_encounters_type_idx` ON `clinical_encounters` (`type`,`occurred_at`,`deleted_at`);
CREATE INDEX `clinical_encounters_invoice_idx` ON `clinical_encounters` (`invoice_id`,`deleted_at`);
CREATE INDEX `emergency_contacts_patient_idx` ON `emergency_contacts` (`patient_id`,`deleted_at`);
CREATE INDEX `encounter_products_product_idx` ON `encounter_products` (`product_id`,`deleted_at`);
CREATE INDEX `encounter_services_service_idx` ON `encounter_services` (`service_id`,`deleted_at`);
CREATE INDEX `inventory_batches_expiry_idx` ON `inventory_batches` (`expires_at`,`deleted_at`);
CREATE INDEX `inventory_stock_location_idx` ON `inventory_stock` (`location_id`,`deleted_at`);
CREATE INDEX `invoice_items_invoice_idx` ON `invoice_items` (`invoice_id`,`deleted_at`);
CREATE INDEX `invoice_items_product_idx` ON `invoice_items` (`product_id`,`deleted_at`);
CREATE INDEX `invoice_items_service_idx` ON `invoice_items` (`service_id`,`deleted_at`);
CREATE INDEX `invoices_patient_idx` ON `invoices` (`patient_id`,`issued_at`,`deleted_at`);
CREATE INDEX `invoices_status_idx` ON `invoices` (`status`,`issued_at`,`deleted_at`);
CREATE INDEX `or_assignments_room_idx` ON `operating_room_assignments` (`operating_room_id`,`released_at`,`deleted_at`);
CREATE INDEX `or_assignments_patient_idx` ON `operating_room_assignments` (`patient_id`,`assigned_at`,`deleted_at`);
CREATE INDEX `or_events_room_idx` ON `operating_room_events` (`operating_room_id`,`occurred_at`,`deleted_at`);
CREATE INDEX `operating_rooms_status_idx` ON `operating_rooms` (`status`,`deleted_at`);
CREATE INDEX `patient_images_patient_idx` ON `patient_images` (`patient_id`,`deleted_at`);
CREATE INDEX `patient_movements_patient_idx` ON `patient_movements` (`patient_id`,`occurred_at`,`deleted_at`);
CREATE INDEX `patient_movements_episode_idx` ON `patient_movements` (`care_episode_id`,`occurred_at`,`deleted_at`);
CREATE INDEX `patients_name_idx` ON `patients` (`first_name`,`last_name`);
CREATE INDEX `patients_email_idx` ON `patients` (`email`);
CREATE INDEX `patients_deleted_idx` ON `patients` (`deleted_at`);
CREATE INDEX `permission_audit_target_idx` ON `permission_audit_logs` (`target_type`,`target_id`,`created_at`);
CREATE INDEX `permission_audit_actor_idx` ON `permission_audit_logs` (`actor_id`,`created_at`);
CREATE INDEX `products_name_idx` ON `products` (`name`,`deleted_at`);
CREATE INDEX `products_category_idx` ON `products` (`category_id`,`deleted_at`);
CREATE INDEX `promotions_period_idx` ON `promotions` (`starts_at`,`ends_at`,`deleted_at`);
CREATE INDEX `purchase_items_purchase_idx` ON `purchase_items` (`purchase_id`,`deleted_at`);
CREATE INDEX `purchase_items_product_idx` ON `purchase_items` (`product_id`,`deleted_at`);
CREATE INDEX `purchases_date_idx` ON `purchases` (`purchased_at`,`deleted_at`);
CREATE INDEX `role_permissions_permission_idx` ON `role_permissions` (`permission_id`,`deleted_at`);
CREATE INDEX `staff_members_name_idx` ON `staff_members` (`first_name`,`last_name`);
CREATE INDEX `staff_members_active_idx` ON `staff_members` (`is_active`,`deleted_at`);
CREATE INDEX `stock_movements_product_idx` ON `stock_movements` (`product_id`,`occurred_at`,`deleted_at`);
CREATE INDEX `stock_movements_encounter_idx` ON `stock_movements` (`clinical_encounter_id`,`deleted_at`);
CREATE INDEX `suppliers_name_idx` ON `suppliers` (`name`);
CREATE INDEX `user_permissions_permission_idx` ON `user_permissions` (`permission_id`,`deleted_at`);
CREATE INDEX `users_role_idx` ON `users` (`role_id`,`deleted_at`);
CREATE INDEX `users_active_idx` ON `users` (`is_active`,`deleted_at`);
INSERT INTO __drizzle_migrations(hash,created_at) VALUES ('e99e04c8ab750e9bae04c0c9a410fac6f3006503b68d4e517560dc725ebb09c5',1785448642168);
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
ALTER TABLE `invoices` ADD `number_sequence_id` varchar(36);
ALTER TABLE `invoices` ADD `sar_number` varchar(50);
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_sar_number_unique` UNIQUE(`sar_number`);
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `consent_instances` ADD CONSTRAINT `consent_instances_template_id_consent_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `consent_templates`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `consent_instances` ADD CONSTRAINT `consent_instances_encounter_fk` FOREIGN KEY (`clinical_encounter_id`) REFERENCES `clinical_encounters`(`id`) ON DELETE cascade ON UPDATE cascade;
ALTER TABLE `consent_instances` ADD CONSTRAINT `consent_instances_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `consent_instances` ADD CONSTRAINT `consent_instances_staff_member_id_staff_members_id_fk` FOREIGN KEY (`staff_member_id`) REFERENCES `staff_members`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `consent_instances` ADD CONSTRAINT `consent_instances_attachment_id_clinical_attachments_id_fk` FOREIGN KEY (`attachment_id`) REFERENCES `clinical_attachments`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `consent_instances` ADD CONSTRAINT `consent_instances_version_fk` FOREIGN KEY (`template_id`,`template_version`) REFERENCES `consent_template_versions`(`template_id`,`version`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `consent_template_versions` ADD CONSTRAINT `consent_template_versions_template_id_consent_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `consent_templates`(`id`) ON DELETE cascade ON UPDATE cascade;
ALTER TABLE `document_deliveries` ADD CONSTRAINT `document_deliveries_attachment_id_clinical_attachments_id_fk` FOREIGN KEY (`attachment_id`) REFERENCES `clinical_attachments`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `document_deliveries` ADD CONSTRAINT `document_deliveries_encounter_fk` FOREIGN KEY (`clinical_encounter_id`) REFERENCES `clinical_encounters`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `document_deliveries` ADD CONSTRAINT `document_deliveries_template_id_consent_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `consent_templates`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `document_deliveries` ADD CONSTRAINT `document_deliveries_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE cascade;
CREATE INDEX `audit_logs_target_idx` ON `audit_logs` (`target_table`,`record_id`,`occurred_at`);
CREATE INDEX `audit_logs_actor_idx` ON `audit_logs` (`actor_id`,`occurred_at`);
CREATE INDEX `consent_instances_patient_idx` ON `consent_instances` (`patient_id`,`created_at`,`deleted_at`);
CREATE INDEX `consent_instances_attachment_idx` ON `consent_instances` (`attachment_id`,`deleted_at`);
CREATE INDEX `consent_template_versions_template_idx` ON `consent_template_versions` (`template_id`,`deleted_at`);
CREATE INDEX `consent_templates_active_idx` ON `consent_templates` (`is_active`,`deleted_at`);
CREATE INDEX `document_deliveries_attachment_idx` ON `document_deliveries` (`attachment_id`,`created_at`);
CREATE INDEX `document_deliveries_encounter_idx` ON `document_deliveries` (`clinical_encounter_id`,`created_at`);
CREATE INDEX `document_deliveries_status_idx` ON `document_deliveries` (`status`,`created_at`);
CREATE INDEX `password_reset_tokens_user_idx` ON `password_reset_tokens` (`user_id`,`expires_at`);
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_number_sequence_id_invoice_number_sequences_id_fk` FOREIGN KEY (`number_sequence_id`) REFERENCES `invoice_number_sequences`(`id`) ON DELETE restrict ON UPDATE cascade;
INSERT INTO __drizzle_migrations(hash,created_at) VALUES ('47013ae8f49bb24c82375b3818d75268e2c848f17370820f181337d54310b6b9',1790716048352);
CREATE TABLE `aggregate_locks` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`scope` varchar(80) NOT NULL,
	CONSTRAINT `aggregate_locks_id` PRIMARY KEY(`id`),
	CONSTRAINT `aggregate_locks_scope_unique` UNIQUE(`scope`)
);
ALTER TABLE `appointments` DROP FOREIGN KEY `appointments_bed_id_beds_id_fk`;
ALTER TABLE `appointments` DROP FOREIGN KEY `appointments_operating_room_id_operating_rooms_id_fk`;
ALTER TABLE `clinical_attachments` DROP FOREIGN KEY `attachments_encounter_fk`;
ALTER TABLE `clinical_encounters` DROP FOREIGN KEY `clinical_encounters_care_episode_id_care_episodes_id_fk`;
ALTER TABLE `consent_instances` DROP FOREIGN KEY `consent_instances_patient_id_patients_id_fk`;
ALTER TABLE `document_deliveries` DROP FOREIGN KEY `document_deliveries_encounter_fk`;
ALTER TABLE `document_deliveries` DROP FOREIGN KEY `document_deliveries_template_id_consent_templates_id_fk`;
ALTER TABLE `inventory_batches` DROP FOREIGN KEY `inventory_batches_location_id_inventory_locations_id_fk`;
ALTER TABLE `invoices` DROP FOREIGN KEY `invoices_patient_id_patients_id_fk`;
DROP INDEX `care_episodes_status_idx` ON `care_episodes`;
DROP INDEX `consent_instances_patient_idx` ON `consent_instances`;
DROP INDEX `document_deliveries_encounter_idx` ON `document_deliveries`;
ALTER TABLE `beds` MODIFY COLUMN `status` enum('available','maintenance','blocked') NOT NULL DEFAULT 'available';
ALTER TABLE `invoices` MODIFY COLUMN `patient_id` varchar(36) NOT NULL;
ALTER TABLE `operating_rooms` MODIFY COLUMN `status` enum('available','maintenance','blocked') NOT NULL DEFAULT 'available';
ALTER TABLE `bed_assignments` ADD `active_key` int GENERATED ALWAYS AS (IF(released_at IS NULL AND deleted_at IS NULL, 1, NULL)) STORED;
ALTER TABLE `document_deliveries` ADD `template_version_id` varchar(36);
ALTER TABLE `document_deliveries` ADD `consent_instance_id` varchar(36);
ALTER TABLE `document_deliveries` ADD `content_sha256` varchar(64);
ALTER TABLE `inventory_stock` ADD `batch_id` varchar(36);
ALTER TABLE `inventory_stock` ADD `batch_key` varchar(36) GENERATED ALWAYS AS (COALESCE(batch_id, 'untracked')) STORED;
ALTER TABLE `operating_room_assignments` ADD `active_key` int GENERATED ALWAYS AS (IF(released_at IS NULL AND deleted_at IS NULL, 1, NULL)) STORED;
ALTER TABLE `stock_movements` ADD `batch_id` varchar(36);
ALTER TABLE `bed_assignments` ADD CONSTRAINT `bed_assignments_active_resource_unique` UNIQUE(`bed_id`,`active_key`);
ALTER TABLE `bed_assignments` ADD CONSTRAINT `bed_assignments_active_patient_unique` UNIQUE(`patient_id`,`active_key`);
ALTER TABLE `care_episodes` ADD CONSTRAINT `care_episodes_id_patient_unique` UNIQUE(`id`,`patient_id`);
ALTER TABLE `clinical_encounters` ADD CONSTRAINT `clinical_encounters_id_patient_unique` UNIQUE(`id`,`patient_id`);
ALTER TABLE `inventory_batches` ADD CONSTRAINT `inventory_batches_id_product_unique` UNIQUE(`id`,`product_id`);
ALTER TABLE `inventory_stock` ADD CONSTRAINT `inventory_stock_product_location_batch_unique` UNIQUE(`product_id`,`location_id`,`batch_key`);
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_id_patient_unique` UNIQUE(`id`,`patient_id`);
ALTER TABLE `operating_room_assignments` ADD CONSTRAINT `or_assignments_active_resource_unique` UNIQUE(`operating_room_id`,`active_key`);
ALTER TABLE `operating_room_assignments` ADD CONSTRAINT `or_assignments_active_patient_unique` UNIQUE(`patient_id`,`active_key`);
ALTER TABLE `patient_movements` ADD CONSTRAINT `patient_movements_id_patient_unique` UNIQUE(`id`,`patient_id`);
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_resource_check` CHECK (`appointments`.`bed_id` IS NULL OR `appointments`.`operating_room_id` IS NULL);
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_period_check` CHECK (`appointments`.`ends_at` > `appointments`.`starts_at`);
ALTER TABLE `bed_assignments` ADD CONSTRAINT `bed_assignments_dates_check` CHECK (`bed_assignments`.`released_at` IS NULL OR `bed_assignments`.`released_at` >= `bed_assignments`.`assigned_at`);
ALTER TABLE `billing_ledger_entries` ADD CONSTRAINT `billing_ledger_amount_check` CHECK (`billing_ledger_entries`.`quantity` > 0 AND `billing_ledger_entries`.`unit_price` >= 0 AND `billing_ledger_entries`.`total_amount` = `billing_ledger_entries`.`quantity` * `billing_ledger_entries`.`unit_price`);
ALTER TABLE `care_episodes` ADD CONSTRAINT `care_episodes_dates_check` CHECK (`care_episodes`.`closed_at` IS NULL OR `care_episodes`.`closed_at` >= `care_episodes`.`opened_at`);
ALTER TABLE `encounter_products` ADD CONSTRAINT `encounter_products_quantity_check` CHECK (`encounter_products`.`quantity` > 0);
ALTER TABLE `encounter_services` ADD CONSTRAINT `encounter_services_quantity_check` CHECK (`encounter_services`.`quantity` > 0);
ALTER TABLE `inventory_batches` ADD CONSTRAINT `inventory_batches_dates_check` CHECK (`inventory_batches`.`expires_at` IS NULL OR `inventory_batches`.`expires_at` >= `inventory_batches`.`received_at`);
ALTER TABLE `inventory_stock` ADD CONSTRAINT `inventory_stock_quantity_check` CHECK (`inventory_stock`.`quantity` >= 0);
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_amount_check` CHECK (`invoice_items`.`quantity` > 0 AND `invoice_items`.`unit_price` >= 0 AND `invoice_items`.`discount_amount` >= 0 AND `invoice_items`.`discount_amount` <= `invoice_items`.`quantity` * `invoice_items`.`unit_price` AND `invoice_items`.`total_amount` = `invoice_items`.`quantity` * `invoice_items`.`unit_price` - `invoice_items`.`discount_amount`);
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_amount_check` CHECK (`invoices`.`amount` >= 0);
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_discounts_check` CHECK (`invoices`.`elderly_discount_percent` BETWEEN 0 AND 100 AND `invoices`.`promotional_discount_percent` BETWEEN 0 AND 100);
ALTER TABLE `operating_room_assignments` ADD CONSTRAINT `or_assignments_dates_check` CHECK (`operating_room_assignments`.`released_at` IS NULL OR `operating_room_assignments`.`released_at` >= `operating_room_assignments`.`assigned_at`);
ALTER TABLE `products` ADD CONSTRAINT `products_price_check` CHECK (`products`.`unit_price` >= 0 AND `products`.`minimum_stock` >= 0);
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_quantity_price_check` CHECK (`purchase_items`.`quantity` > 0 AND `purchase_items`.`unit_cost` >= 0);
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_amount_check` CHECK (`purchases`.`total_amount` >= 0);
ALTER TABLE `services` ADD CONSTRAINT `services_price_check` CHECK (`services`.`price` >= 0);
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_quantity_check` CHECK (`stock_movements`.`quantity` > 0);
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_bed_id_beds_id_fk` FOREIGN KEY (`bed_id`) REFERENCES `beds`(`id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_operating_room_id_operating_rooms_id_fk` FOREIGN KEY (`operating_room_id`) REFERENCES `operating_rooms`(`id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `bed_assignments` ADD CONSTRAINT `beds_episode_patient_fk` FOREIGN KEY (`care_episode_id`,`patient_id`) REFERENCES `care_episodes`(`id`,`patient_id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `billing_ledger_entries` ADD CONSTRAINT `ledger_movement_patient_fk` FOREIGN KEY (`movement_id`,`patient_id`) REFERENCES `patient_movements`(`id`,`patient_id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `billing_ledger_entries` ADD CONSTRAINT `ledger_invoice_patient_fk` FOREIGN KEY (`invoice_id`,`patient_id`) REFERENCES `invoices`(`id`,`patient_id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `billing_ledger_entries` ADD CONSTRAINT `ledger_episode_patient_fk` FOREIGN KEY (`care_episode_id`,`patient_id`) REFERENCES `care_episodes`(`id`,`patient_id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `care_episodes` ADD CONSTRAINT `care_episodes_previous_episode_id_care_episodes_id_fk` FOREIGN KEY (`previous_episode_id`) REFERENCES `care_episodes`(`id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `care_episodes` ADD CONSTRAINT `care_episodes_previous_patient_fk` FOREIGN KEY (`previous_episode_id`,`patient_id`) REFERENCES `care_episodes`(`id`,`patient_id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `clinical_attachments` ADD CONSTRAINT `attachments_encounter_fk` FOREIGN KEY (`clinical_encounter_id`,`patient_id`) REFERENCES `clinical_encounters`(`id`,`patient_id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `clinical_encounters` ADD CONSTRAINT `encounters_invoice_patient_fk` FOREIGN KEY (`invoice_id`,`patient_id`) REFERENCES `invoices`(`id`,`patient_id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `document_deliveries` ADD CONSTRAINT `deliveries_version_fk` FOREIGN KEY (`template_version_id`) REFERENCES `consent_template_versions`(`id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `document_deliveries` ADD CONSTRAINT `deliveries_consent_fk` FOREIGN KEY (`consent_instance_id`) REFERENCES `consent_instances`(`id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `inventory_stock` ADD CONSTRAINT `inventory_stock_batch_product_fk` FOREIGN KEY (`batch_id`,`product_id`) REFERENCES `inventory_batches`(`id`,`product_id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_episode_patient_fk` FOREIGN KEY (`care_episode_id`,`patient_id`) REFERENCES `care_episodes`(`id`,`patient_id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `operating_room_assignments` ADD CONSTRAINT `rooms_episode_patient_fk` FOREIGN KEY (`care_episode_id`,`patient_id`) REFERENCES `care_episodes`(`id`,`patient_id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `patient_movements` ADD CONSTRAINT `patient_movements_bed_id_beds_id_fk` FOREIGN KEY (`bed_id`) REFERENCES `beds`(`id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `patient_movements` ADD CONSTRAINT `patient_movements_operating_room_id_operating_rooms_id_fk` FOREIGN KEY (`operating_room_id`) REFERENCES `operating_rooms`(`id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `patient_movements` ADD CONSTRAINT `movements_encounter_patient_fk` FOREIGN KEY (`clinical_encounter_id`,`patient_id`) REFERENCES `clinical_encounters`(`id`,`patient_id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `patient_movements` ADD CONSTRAINT `movements_episode_patient_fk` FOREIGN KEY (`care_episode_id`,`patient_id`) REFERENCES `care_episodes`(`id`,`patient_id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_batch_product_fk` FOREIGN KEY (`batch_id`,`product_id`) REFERENCES `inventory_batches`(`id`,`product_id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_batch_product_fk` FOREIGN KEY (`batch_id`,`product_id`) REFERENCES `inventory_batches`(`id`,`product_id`) ON DELETE restrict ON UPDATE restrict;
CREATE INDEX `consent_instances_visit_template_idx` ON `consent_instances` (`clinical_encounter_id`,`template_id`,`created_at`);
CREATE INDEX `document_deliveries_consent_idx` ON `document_deliveries` (`consent_instance_id`,`created_at`);
ALTER TABLE `care_episodes` DROP COLUMN `status`;
ALTER TABLE `clinical_encounters` DROP COLUMN `care_episode_id`;
ALTER TABLE `consent_instances` DROP COLUMN `patient_id`;
ALTER TABLE `document_deliveries` DROP COLUMN `clinical_encounter_id`;
ALTER TABLE `document_deliveries` DROP COLUMN `template_id`;
ALTER TABLE `inventory_batches` DROP COLUMN `location_id`;
ALTER TABLE `inventory_batches` DROP COLUMN `quantity`;
ALTER TABLE `inventory_batches` DROP COLUMN `unit_cost`;
ALTER TABLE `consent_instances` DROP INDEX `consent_instances_visit_template_unique`;
ALTER TABLE `inventory_stock` DROP INDEX `inventory_stock_product_location_unique`;
INSERT INTO __drizzle_migrations(hash,created_at) VALUES ('e9c095bb9124c7d479ffd801ea38e42dc52e2626b0b0e87163538e40d6144fa0',1790782059883);
ALTER TABLE `consent_instances` DROP FOREIGN KEY `consent_instances_attachment_id_clinical_attachments_id_fk`;
ALTER TABLE `document_deliveries` DROP FOREIGN KEY `document_deliveries_attachment_id_clinical_attachments_id_fk`;
ALTER TABLE `invoice_items` DROP FOREIGN KEY `invoice_items_product_id_products_id_fk`;
ALTER TABLE `invoice_items` DROP FOREIGN KEY `invoice_items_service_id_services_id_fk`;
ALTER TABLE `clinical_attachments` ADD CONSTRAINT `attachments_id_encounter_unique` UNIQUE(`id`,`clinical_encounter_id`);
ALTER TABLE `clinical_attachments` ADD CONSTRAINT `attachments_size_check` CHECK (`clinical_attachments`.`size_bytes` > 0);
ALTER TABLE `consent_instances` ADD CONSTRAINT `consent_acceptance_check` CHECK ((`consent_instances`.`status` = 'printed' AND `consent_instances`.`accepted_at` IS NULL AND `consent_instances`.`acceptance_method` IS NULL AND `consent_instances`.`attachment_id` IS NULL) OR (`consent_instances`.`status` = 'accepted' AND `consent_instances`.`accepted_at` IS NOT NULL AND `consent_instances`.`acceptance_method` IS NOT NULL AND `consent_instances`.`attachment_id` IS NOT NULL));
ALTER TABLE `consent_template_versions` ADD CONSTRAINT `consent_version_positive_check` CHECK (`consent_template_versions`.`version` > 0);
ALTER TABLE `document_deliveries` ADD CONSTRAINT `document_deliveries_identity_check` CHECK ((`document_deliveries`.`document_type` = 'attachment' AND `document_deliveries`.`attachment_id` IS NOT NULL AND `document_deliveries`.`consent_instance_id` IS NULL AND `document_deliveries`.`template_version_id` IS NULL) OR (`document_deliveries`.`document_type` = 'consent' AND `document_deliveries`.`attachment_id` IS NULL AND `document_deliveries`.`consent_instance_id` IS NOT NULL AND `document_deliveries`.`template_version_id` IS NULL) OR (`document_deliveries`.`document_type` = 'consent_draft' AND `document_deliveries`.`attachment_id` IS NULL AND `document_deliveries`.`consent_instance_id` IS NULL AND `document_deliveries`.`template_version_id` IS NOT NULL) OR (`document_deliveries`.`document_type` = 'invoice_report' AND `document_deliveries`.`attachment_id` IS NULL AND `document_deliveries`.`consent_instance_id` IS NULL AND `document_deliveries`.`template_version_id` IS NULL));
ALTER TABLE `document_deliveries` ADD CONSTRAINT `document_deliveries_result_check` CHECK ((`document_deliveries`.`status` = 'pending' AND `document_deliveries`.`completed_at` IS NULL AND `document_deliveries`.`http_status` IS NULL) OR (`document_deliveries`.`status` IN ('completed', 'failed') AND `document_deliveries`.`completed_at` IS NOT NULL AND `document_deliveries`.`http_status` BETWEEN 100 AND 599));
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_resource_check` CHECK (`invoice_items`.`product_id` IS NULL OR `invoice_items`.`service_id` IS NULL);
ALTER TABLE `consent_instances` ADD CONSTRAINT `consent_attachment_encounter_fk` FOREIGN KEY (`attachment_id`,`clinical_encounter_id`) REFERENCES `clinical_attachments`(`id`,`clinical_encounter_id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `consent_instances` ADD CONSTRAINT `consent_instances_attachment_id_clinical_attachments_id_fk` FOREIGN KEY (`attachment_id`) REFERENCES `clinical_attachments`(`id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `document_deliveries` ADD CONSTRAINT `document_deliveries_attachment_id_clinical_attachments_id_fk` FOREIGN KEY (`attachment_id`) REFERENCES `clinical_attachments`(`id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE restrict;
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_service_id_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE restrict ON UPDATE restrict;
INSERT INTO __drizzle_migrations(hash,created_at) VALUES ('b82cceef1ae7b4b1ab8f9116de21691bc68767ba3c6838b7c5bc72cd9afbe5bd',1790782917498);
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
ALTER TABLE `consent_instances` ADD `consent_template_version_id` varchar(36);
ALTER TABLE `consent_instances` ADD `template_name` varchar(200);
ALTER TABLE `consent_instances` ADD `patient_id` varchar(36);
ALTER TABLE `consent_instances` ADD `snapshot_json` json;
ALTER TABLE `consent_instances` ADD `document_sha256` varchar(64);
ALTER TABLE `consent_instances` ADD `created_by` varchar(36);
ALTER TABLE `consent_instances` ADD `accepted_by` varchar(36);
ALTER TABLE `consent_template_versions` ADD `created_by` varchar(36);
ALTER TABLE `consent_templates` ADD `created_by` varchar(36);
ALTER TABLE `patients` ADD `identification_type` varchar(30) DEFAULT 'identidad' NOT NULL;
ALTER TABLE `patients` ADD `notes` text;
ALTER TABLE `user_profiles` ADD `gender` enum('male','female','unspecified');
ALTER TABLE `encounter_clinical_reviews` ADD CONSTRAINT `clinical_review_encounter_fk` FOREIGN KEY (`clinical_encounter_id`) REFERENCES `clinical_encounters`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `encounter_clinical_reviews` ADD CONSTRAINT `clinical_review_profile_fk` FOREIGN KEY (`profile_id`) REFERENCES `patient_clinical_profiles`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `encounter_clinical_reviews` ADD CONSTRAINT `clinical_review_actor_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `patient_clinical_profiles` ADD CONSTRAINT `clinical_profile_patient_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `patient_clinical_profiles` ADD CONSTRAINT `clinical_profile_actor_fk` FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE cascade;
ALTER TABLE `consent_instances` ADD CONSTRAINT `consent_instance_version_id_fk` FOREIGN KEY (`consent_template_version_id`) REFERENCES `consent_template_versions`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `consent_instances` ADD CONSTRAINT `consent_instances_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `consent_instances` ADD CONSTRAINT `consent_instances_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `consent_instances` ADD CONSTRAINT `consent_instances_accepted_by_users_id_fk` FOREIGN KEY (`accepted_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `consent_template_versions` ADD CONSTRAINT `consent_template_versions_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `consent_templates` ADD CONSTRAINT `consent_templates_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
UPDATE `consent_instances` AS ci
JOIN `consent_template_versions` AS v ON v.template_id = ci.template_id AND v.version = ci.template_version
JOIN `consent_templates` AS t ON t.id = ci.template_id
JOIN `clinical_encounters` AS e ON e.id = ci.clinical_encounter_id
SET ci.consent_template_version_id = v.id, ci.template_name = t.name, ci.patient_id = e.patient_id;
INSERT INTO __drizzle_migrations(hash,created_at) VALUES ('7ce71690e05c783e1b4b97bf08dfef6dae5467fb4b7ccc1164ecb729aa8ac214',1792950644401);
GRANT ALL PRIVILEGES ON medit.* TO 'medit_staging'@'%';
CREATE DATABASE medit_qa_global CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medit_qa_global;
CREATE TABLE __drizzle_migrations (id SERIAL PRIMARY KEY, hash TEXT NOT NULL, created_at BIGINT);
CREATE TABLE `companies` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`code` varchar(10) NOT NULL,
	`name` varchar(150) NOT NULL,
	`database_name` varchar(64) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`),
	CONSTRAINT `companies_code_unique` UNIQUE(`code`),
	CONSTRAINT `companies_database_name_unique` UNIQUE(`database_name`)
);
CREATE INDEX `companies_active_idx` ON `companies` (`is_active`,`deleted_at`);
INSERT INTO __drizzle_migrations(hash,created_at) VALUES ('668e69e37671c6c05f4d30325a2ff3f54372691a5adb091586217f37ff4e936c',1785448531204);
INSERT INTO companies SELECT * FROM medit_global.companies;
UPDATE companies SET database_name='medit' WHERE code='MEDITQA';
GRANT ALL PRIVILEGES ON medit_qa_global.* TO 'medit_staging'@'%';
