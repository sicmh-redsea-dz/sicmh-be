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
--> statement-breakpoint
CREATE INDEX `companies_active_idx` ON `companies` (`is_active`,`deleted_at`);