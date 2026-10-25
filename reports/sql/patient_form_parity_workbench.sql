-- Select the target tenant schema in Workbench before running the entire script.
SELECT DATABASE() AS selected_tenant_database;
-- Run on the target tenant database before starting the updated backend.
-- Additive and rerunnable; does not infer document types or modify existing patient data.
SET @patient_parity_sql = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'patients' AND column_name = 'identification_type'), 'SELECT 1', 'ALTER TABLE `patients` ADD COLUMN `identification_type` varchar(30) NOT NULL DEFAULT ''identidad''');
PREPARE patient_parity_stmt FROM @patient_parity_sql;
EXECUTE patient_parity_stmt;
DEALLOCATE PREPARE patient_parity_stmt;
SET @patient_parity_sql = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'patients' AND column_name = 'notes'), 'SELECT 1', 'ALTER TABLE `patients` ADD COLUMN `notes` text NULL');
PREPARE patient_parity_stmt FROM @patient_parity_sql;
EXECUTE patient_parity_stmt;
DEALLOCATE PREPARE patient_parity_stmt;

SHOW COLUMNS FROM patients WHERE Field IN ('identification_type', 'notes');
