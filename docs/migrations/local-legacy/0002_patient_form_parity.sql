-- Run on the target tenant database before starting the updated backend.
-- Additive and rerunnable; does not infer document types or modify existing patient data.
SET @patient_parity_sql = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'patients' AND column_name = 'identification_type'), 'SELECT 1', 'ALTER TABLE `patients` ADD COLUMN `identification_type` varchar(30) NOT NULL DEFAULT ''identidad''');
--> statement-breakpoint
PREPARE patient_parity_stmt FROM @patient_parity_sql;
--> statement-breakpoint
EXECUTE patient_parity_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE patient_parity_stmt;
--> statement-breakpoint
SET @patient_parity_sql = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'patients' AND column_name = 'notes'), 'SELECT 1', 'ALTER TABLE `patients` ADD COLUMN `notes` text NULL');
--> statement-breakpoint
PREPARE patient_parity_stmt FROM @patient_parity_sql;
--> statement-breakpoint
EXECUTE patient_parity_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE patient_parity_stmt;
