ALTER TABLE `documents` ADD `propertyId` int;--> statement-breakpoint
ALTER TABLE `documents` ADD `propertyId` int;--> statement-breakpoint
UPDATE `documents` SET `propertyId` = `entityId` WHERE `entityType` = 'property' AND `propertyId` IS NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `tenantId` int;--> statement-breakpoint
ALTER TABLE `documents` ADD `shareToken` varchar(64);--> statement-breakpoint
ALTER TABLE `documents` ADD `shareExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_shareToken_unique` UNIQUE(`shareToken`);--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;
