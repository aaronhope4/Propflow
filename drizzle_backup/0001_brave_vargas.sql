CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` enum('property','unit','tenant','lease','expense') NOT NULL,
	`entityId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` text NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`uploadedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`unitId` int,
	`category` enum('mortgage','insurance','taxes','utilities','maintenance','management','landscaping','advertising','legal','supplies','other') NOT NULL DEFAULT 'other',
	`amount` decimal(10,2) NOT NULL,
	`date` date NOT NULL,
	`description` varchar(500) NOT NULL,
	`vendor` varchar(255),
	`receiptUrl` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unitId` int NOT NULL,
	`tenantId` int NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`rentAmount` decimal(10,2) NOT NULL,
	`depositAmount` decimal(10,2) NOT NULL,
	`depositPaid` boolean DEFAULT false,
	`paymentDueDay` int NOT NULL DEFAULT 1,
	`lateFeeAmount` decimal(10,2) DEFAULT '0',
	`lateFeeGraceDays` int DEFAULT 5,
	`status` enum('pending','active','expired','terminated') NOT NULL DEFAULT 'pending',
	`terms` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unitId` int NOT NULL,
	`tenantId` int,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`category` enum('plumbing','electrical','hvac','appliance','structural','pest','cleaning','other') NOT NULL DEFAULT 'other',
	`priority` enum('urgent','high','medium','low') NOT NULL DEFAULT 'medium',
	`status` enum('open','in_progress','on_hold','resolved','cancelled') NOT NULL DEFAULT 'open',
	`assignedTo` varchar(255),
	`estimatedCost` decimal(10,2),
	`actualCost` decimal(10,2),
	`scheduledDate` date,
	`resolvedAt` timestamp,
	`imageUrl` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenance_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `owners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(50),
	`company` varchar(255),
	`address` text,
	`city` varchar(100),
	`state` varchar(50),
	`zip` varchar(20),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `owners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int,
	`name` varchar(255) NOT NULL,
	`address` text NOT NULL,
	`city` varchar(100) NOT NULL,
	`state` varchar(50) NOT NULL,
	`zip` varchar(20) NOT NULL,
	`country` varchar(50) DEFAULT 'US',
	`type` enum('residential','commercial','mixed','industrial') NOT NULL DEFAULT 'residential',
	`description` text,
	`yearBuilt` int,
	`totalUnits` int NOT NULL DEFAULT 1,
	`imageUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rent_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leaseId` int NOT NULL,
	`tenantId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`lateFee` decimal(10,2) DEFAULT '0',
	`totalAmount` decimal(10,2) NOT NULL,
	`dueDate` date NOT NULL,
	`paidDate` date,
	`status` enum('pending','paid','overdue','partial','waived') NOT NULL DEFAULT 'pending',
	`paymentMethod` enum('ach','credit_card','check','cash','other'),
	`transactionId` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rent_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`dateOfBirth` date,
	`emergencyContactName` varchar(255),
	`emergencyContactPhone` varchar(50),
	`emergencyContactRelation` varchar(100),
	`idType` varchar(50),
	`idNumber` varchar(100),
	`employerName` varchar(255),
	`employerPhone` varchar(50),
	`monthlyIncome` decimal(10,2),
	`notes` text,
	`status` enum('active','inactive','evicted') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`unitNumber` varchar(50) NOT NULL,
	`type` enum('studio','1br','2br','3br','4br+','commercial') NOT NULL DEFAULT '1br',
	`bedrooms` int DEFAULT 1,
	`bathrooms` decimal(3,1) DEFAULT '1.0',
	`sqft` int,
	`floor` int,
	`rentAmount` decimal(10,2) NOT NULL,
	`depositAmount` decimal(10,2),
	`status` enum('vacant','occupied','maintenance','unavailable') NOT NULL DEFAULT 'vacant',
	`amenities` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `units_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','tenant') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leases` ADD CONSTRAINT `leases_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leases` ADD CONSTRAINT `leases_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `maintenance_requests_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `maintenance_requests_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `owners` ADD CONSTRAINT `owners_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_ownerId_owners_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rent_payments` ADD CONSTRAINT `rent_payments_leaseId_leases_id_fk` FOREIGN KEY (`leaseId`) REFERENCES `leases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rent_payments` ADD CONSTRAINT `rent_payments_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenants` ADD CONSTRAINT `tenants_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `units` ADD CONSTRAINT `units_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;