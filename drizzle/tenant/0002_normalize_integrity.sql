CREATE TABLE `aggregate_locks` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`scope` varchar(80) NOT NULL,
	CONSTRAINT `aggregate_locks_id` PRIMARY KEY(`id`),
	CONSTRAINT `aggregate_locks_scope_unique` UNIQUE(`scope`)
);
--> statement-breakpoint
ALTER TABLE `appointments` DROP FOREIGN KEY `appointments_bed_id_beds_id_fk`;
--> statement-breakpoint
ALTER TABLE `appointments` DROP FOREIGN KEY `appointments_operating_room_id_operating_rooms_id_fk`;
--> statement-breakpoint
ALTER TABLE `clinical_attachments` DROP FOREIGN KEY `attachments_encounter_fk`;
--> statement-breakpoint
ALTER TABLE `clinical_encounters` DROP FOREIGN KEY `clinical_encounters_care_episode_id_care_episodes_id_fk`;
--> statement-breakpoint
ALTER TABLE `consent_instances` DROP FOREIGN KEY `consent_instances_patient_id_patients_id_fk`;
--> statement-breakpoint
ALTER TABLE `document_deliveries` DROP FOREIGN KEY `document_deliveries_encounter_fk`;
--> statement-breakpoint
ALTER TABLE `document_deliveries` DROP FOREIGN KEY `document_deliveries_template_id_consent_templates_id_fk`;
--> statement-breakpoint
ALTER TABLE `inventory_batches` DROP FOREIGN KEY `inventory_batches_location_id_inventory_locations_id_fk`;
--> statement-breakpoint
ALTER TABLE `invoices` DROP FOREIGN KEY `invoices_patient_id_patients_id_fk`;
--> statement-breakpoint
DROP INDEX `care_episodes_status_idx` ON `care_episodes`;--> statement-breakpoint
DROP INDEX `consent_instances_patient_idx` ON `consent_instances`;--> statement-breakpoint
DROP INDEX `document_deliveries_encounter_idx` ON `document_deliveries`;--> statement-breakpoint
ALTER TABLE `beds` MODIFY COLUMN `status` enum('available','maintenance','blocked') NOT NULL DEFAULT 'available';--> statement-breakpoint
ALTER TABLE `invoices` MODIFY COLUMN `patient_id` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `operating_rooms` MODIFY COLUMN `status` enum('available','maintenance','blocked') NOT NULL DEFAULT 'available';--> statement-breakpoint
ALTER TABLE `bed_assignments` ADD `active_key` int GENERATED ALWAYS AS (IF(released_at IS NULL AND deleted_at IS NULL, 1, NULL)) STORED;--> statement-breakpoint
ALTER TABLE `document_deliveries` ADD `template_version_id` varchar(36);--> statement-breakpoint
ALTER TABLE `document_deliveries` ADD `consent_instance_id` varchar(36);--> statement-breakpoint
ALTER TABLE `document_deliveries` ADD `content_sha256` varchar(64);--> statement-breakpoint
ALTER TABLE `inventory_stock` ADD `batch_id` varchar(36);--> statement-breakpoint
ALTER TABLE `inventory_stock` ADD `batch_key` varchar(36) GENERATED ALWAYS AS (COALESCE(batch_id, 'untracked')) STORED;--> statement-breakpoint
ALTER TABLE `operating_room_assignments` ADD `active_key` int GENERATED ALWAYS AS (IF(released_at IS NULL AND deleted_at IS NULL, 1, NULL)) STORED;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `batch_id` varchar(36);--> statement-breakpoint
ALTER TABLE `bed_assignments` ADD CONSTRAINT `bed_assignments_active_resource_unique` UNIQUE(`bed_id`,`active_key`);--> statement-breakpoint
ALTER TABLE `bed_assignments` ADD CONSTRAINT `bed_assignments_active_patient_unique` UNIQUE(`patient_id`,`active_key`);--> statement-breakpoint
ALTER TABLE `care_episodes` ADD CONSTRAINT `care_episodes_id_patient_unique` UNIQUE(`id`,`patient_id`);--> statement-breakpoint
ALTER TABLE `clinical_encounters` ADD CONSTRAINT `clinical_encounters_id_patient_unique` UNIQUE(`id`,`patient_id`);--> statement-breakpoint
ALTER TABLE `inventory_batches` ADD CONSTRAINT `inventory_batches_id_product_unique` UNIQUE(`id`,`product_id`);--> statement-breakpoint
ALTER TABLE `inventory_stock` ADD CONSTRAINT `inventory_stock_product_location_batch_unique` UNIQUE(`product_id`,`location_id`,`batch_key`);--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_id_patient_unique` UNIQUE(`id`,`patient_id`);--> statement-breakpoint
ALTER TABLE `operating_room_assignments` ADD CONSTRAINT `or_assignments_active_resource_unique` UNIQUE(`operating_room_id`,`active_key`);--> statement-breakpoint
ALTER TABLE `operating_room_assignments` ADD CONSTRAINT `or_assignments_active_patient_unique` UNIQUE(`patient_id`,`active_key`);--> statement-breakpoint
ALTER TABLE `patient_movements` ADD CONSTRAINT `patient_movements_id_patient_unique` UNIQUE(`id`,`patient_id`);--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_resource_check` CHECK (`appointments`.`bed_id` IS NULL OR `appointments`.`operating_room_id` IS NULL);--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_period_check` CHECK (`appointments`.`ends_at` > `appointments`.`starts_at`);--> statement-breakpoint
ALTER TABLE `bed_assignments` ADD CONSTRAINT `bed_assignments_dates_check` CHECK (`bed_assignments`.`released_at` IS NULL OR `bed_assignments`.`released_at` >= `bed_assignments`.`assigned_at`);--> statement-breakpoint
ALTER TABLE `billing_ledger_entries` ADD CONSTRAINT `billing_ledger_amount_check` CHECK (`billing_ledger_entries`.`quantity` > 0 AND `billing_ledger_entries`.`unit_price` >= 0 AND `billing_ledger_entries`.`total_amount` = `billing_ledger_entries`.`quantity` * `billing_ledger_entries`.`unit_price`);--> statement-breakpoint
ALTER TABLE `care_episodes` ADD CONSTRAINT `care_episodes_dates_check` CHECK (`care_episodes`.`closed_at` IS NULL OR `care_episodes`.`closed_at` >= `care_episodes`.`opened_at`);--> statement-breakpoint
ALTER TABLE `encounter_products` ADD CONSTRAINT `encounter_products_quantity_check` CHECK (`encounter_products`.`quantity` > 0);--> statement-breakpoint
ALTER TABLE `encounter_services` ADD CONSTRAINT `encounter_services_quantity_check` CHECK (`encounter_services`.`quantity` > 0);--> statement-breakpoint
ALTER TABLE `inventory_batches` ADD CONSTRAINT `inventory_batches_dates_check` CHECK (`inventory_batches`.`expires_at` IS NULL OR `inventory_batches`.`expires_at` >= `inventory_batches`.`received_at`);--> statement-breakpoint
ALTER TABLE `inventory_stock` ADD CONSTRAINT `inventory_stock_quantity_check` CHECK (`inventory_stock`.`quantity` >= 0);--> statement-breakpoint
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_amount_check` CHECK (`invoice_items`.`quantity` > 0 AND `invoice_items`.`unit_price` >= 0 AND `invoice_items`.`discount_amount` >= 0 AND `invoice_items`.`discount_amount` <= `invoice_items`.`quantity` * `invoice_items`.`unit_price` AND `invoice_items`.`total_amount` = `invoice_items`.`quantity` * `invoice_items`.`unit_price` - `invoice_items`.`discount_amount`);--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_amount_check` CHECK (`invoices`.`amount` >= 0);--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_discounts_check` CHECK (`invoices`.`elderly_discount_percent` BETWEEN 0 AND 100 AND `invoices`.`promotional_discount_percent` BETWEEN 0 AND 100);--> statement-breakpoint
ALTER TABLE `operating_room_assignments` ADD CONSTRAINT `or_assignments_dates_check` CHECK (`operating_room_assignments`.`released_at` IS NULL OR `operating_room_assignments`.`released_at` >= `operating_room_assignments`.`assigned_at`);--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_price_check` CHECK (`products`.`unit_price` >= 0 AND `products`.`minimum_stock` >= 0);--> statement-breakpoint
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_quantity_price_check` CHECK (`purchase_items`.`quantity` > 0 AND `purchase_items`.`unit_cost` >= 0);--> statement-breakpoint
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_amount_check` CHECK (`purchases`.`total_amount` >= 0);--> statement-breakpoint
ALTER TABLE `services` ADD CONSTRAINT `services_price_check` CHECK (`services`.`price` >= 0);--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_quantity_check` CHECK (`stock_movements`.`quantity` > 0);--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_bed_id_beds_id_fk` FOREIGN KEY (`bed_id`) REFERENCES `beds`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_operating_room_id_operating_rooms_id_fk` FOREIGN KEY (`operating_room_id`) REFERENCES `operating_rooms`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `bed_assignments` ADD CONSTRAINT `beds_episode_patient_fk` FOREIGN KEY (`care_episode_id`,`patient_id`) REFERENCES `care_episodes`(`id`,`patient_id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `billing_ledger_entries` ADD CONSTRAINT `ledger_movement_patient_fk` FOREIGN KEY (`movement_id`,`patient_id`) REFERENCES `patient_movements`(`id`,`patient_id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `billing_ledger_entries` ADD CONSTRAINT `ledger_invoice_patient_fk` FOREIGN KEY (`invoice_id`,`patient_id`) REFERENCES `invoices`(`id`,`patient_id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `billing_ledger_entries` ADD CONSTRAINT `ledger_episode_patient_fk` FOREIGN KEY (`care_episode_id`,`patient_id`) REFERENCES `care_episodes`(`id`,`patient_id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `care_episodes` ADD CONSTRAINT `care_episodes_previous_episode_id_care_episodes_id_fk` FOREIGN KEY (`previous_episode_id`) REFERENCES `care_episodes`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `care_episodes` ADD CONSTRAINT `care_episodes_previous_patient_fk` FOREIGN KEY (`previous_episode_id`,`patient_id`) REFERENCES `care_episodes`(`id`,`patient_id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `clinical_attachments` ADD CONSTRAINT `attachments_encounter_fk` FOREIGN KEY (`clinical_encounter_id`,`patient_id`) REFERENCES `clinical_encounters`(`id`,`patient_id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `clinical_encounters` ADD CONSTRAINT `encounters_invoice_patient_fk` FOREIGN KEY (`invoice_id`,`patient_id`) REFERENCES `invoices`(`id`,`patient_id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `document_deliveries` ADD CONSTRAINT `deliveries_version_fk` FOREIGN KEY (`template_version_id`) REFERENCES `consent_template_versions`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `document_deliveries` ADD CONSTRAINT `deliveries_consent_fk` FOREIGN KEY (`consent_instance_id`) REFERENCES `consent_instances`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `inventory_stock` ADD CONSTRAINT `inventory_stock_batch_product_fk` FOREIGN KEY (`batch_id`,`product_id`) REFERENCES `inventory_batches`(`id`,`product_id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_episode_patient_fk` FOREIGN KEY (`care_episode_id`,`patient_id`) REFERENCES `care_episodes`(`id`,`patient_id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `operating_room_assignments` ADD CONSTRAINT `rooms_episode_patient_fk` FOREIGN KEY (`care_episode_id`,`patient_id`) REFERENCES `care_episodes`(`id`,`patient_id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `patient_movements` ADD CONSTRAINT `patient_movements_bed_id_beds_id_fk` FOREIGN KEY (`bed_id`) REFERENCES `beds`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `patient_movements` ADD CONSTRAINT `patient_movements_operating_room_id_operating_rooms_id_fk` FOREIGN KEY (`operating_room_id`) REFERENCES `operating_rooms`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `patient_movements` ADD CONSTRAINT `movements_encounter_patient_fk` FOREIGN KEY (`clinical_encounter_id`,`patient_id`) REFERENCES `clinical_encounters`(`id`,`patient_id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `patient_movements` ADD CONSTRAINT `movements_episode_patient_fk` FOREIGN KEY (`care_episode_id`,`patient_id`) REFERENCES `care_episodes`(`id`,`patient_id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_batch_product_fk` FOREIGN KEY (`batch_id`,`product_id`) REFERENCES `inventory_batches`(`id`,`product_id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_batch_product_fk` FOREIGN KEY (`batch_id`,`product_id`) REFERENCES `inventory_batches`(`id`,`product_id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `consent_instances_visit_template_idx` ON `consent_instances` (`clinical_encounter_id`,`template_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `document_deliveries_consent_idx` ON `document_deliveries` (`consent_instance_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `care_episodes` DROP COLUMN `status`;--> statement-breakpoint
ALTER TABLE `clinical_encounters` DROP COLUMN `care_episode_id`;--> statement-breakpoint
ALTER TABLE `consent_instances` DROP COLUMN `patient_id`;--> statement-breakpoint
ALTER TABLE `document_deliveries` DROP COLUMN `clinical_encounter_id`;--> statement-breakpoint
ALTER TABLE `document_deliveries` DROP COLUMN `template_id`;--> statement-breakpoint
ALTER TABLE `inventory_batches` DROP COLUMN `location_id`;--> statement-breakpoint
ALTER TABLE `inventory_batches` DROP COLUMN `quantity`;--> statement-breakpoint
ALTER TABLE `inventory_batches` DROP COLUMN `unit_cost`;--> statement-breakpoint
ALTER TABLE `consent_instances` DROP INDEX `consent_instances_visit_template_unique`;--> statement-breakpoint
ALTER TABLE `inventory_stock` DROP INDEX `inventory_stock_product_location_unique`;