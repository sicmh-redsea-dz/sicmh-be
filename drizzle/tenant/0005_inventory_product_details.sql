ALTER TABLE `products` ADD `purchase_price` decimal(12,2);--> statement-breakpoint
ALTER TABLE `products` ADD `expiration_date` date;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_purchase_price_check` CHECK (`products`.`purchase_price` IS NULL OR `products`.`purchase_price` >= 0);
--> statement-breakpoint
INSERT INTO inventory_locations (id, code, name) VALUES
(UUID(), 'main', 'Inventario General'),
(UUID(), 'outpatient', 'Consulta Externa'),
(UUID(), 'emergency', 'Emergencia'),
(UUID(), 'operating_room', 'Quir?fano'),
(UUID(), 'hospitalization', 'Hospitalizaci?n')
ON DUPLICATE KEY UPDATE deleted_at = NULL;
