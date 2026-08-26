CREATE TABLE `vendor_insurance_certificates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`vendorId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` text NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`expiresAt` date NOT NULL,
	`lastReminderStage` int,
	`lastReminderSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vendor_insurance_certificates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_performance_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`vendorId` int NOT NULL,
	`note` text NOT NULL,
	`rating` int,
	`authorId` int,
	`authorName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vendor_performance_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `vendors` ADD `preferredProvider` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `vendors` ADD `serviceAreas` text;--> statement-breakpoint
ALTER TABLE `vendor_insurance_certificates` ADD CONSTRAINT `vendor_insurance_certificates_orgId_organizations_id_fk` FOREIGN KEY (`orgId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_insurance_certificates` ADD CONSTRAINT `vendor_insurance_certificates_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_performance_notes` ADD CONSTRAINT `vendor_performance_notes_orgId_organizations_id_fk` FOREIGN KEY (`orgId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_performance_notes` ADD CONSTRAINT `vendor_performance_notes_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_performance_notes` ADD CONSTRAINT `vendor_performance_notes_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;