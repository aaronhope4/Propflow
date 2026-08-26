CREATE TABLE `announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`propertyId` int,
	`audience` enum('all_tenants','property','specific') NOT NULL DEFAULT 'all_tenants',
	`sentBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `autopay_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`leaseId` int,
	`enabled` boolean NOT NULL DEFAULT false,
	`dayOfMonth` int NOT NULL DEFAULT 1,
	`paymentMethod` enum('bank_account','credit_card') NOT NULL DEFAULT 'bank_account',
	`amount` decimal(10,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `autopay_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bank_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int,
	`name` varchar(255) NOT NULL,
	`type` enum('operating','security_deposit','trust','reserve') NOT NULL DEFAULT 'operating',
	`accountNumberMask` varchar(20),
	`bankBalance` decimal(14,2) NOT NULL DEFAULT '0',
	`bookBalance` decimal(14,2) NOT NULL DEFAULT '0',
	`isConnected` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bank_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calendar_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`type` enum('move_in','move_out','lease_expiration','inspection','task','showing','other') NOT NULL DEFAULT 'other',
	`date` date NOT NULL,
	`propertyId` int,
	`unitId` int,
	`relatedId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `calendar_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` enum('property','unit','tenant','lease','expense') NOT NULL,
	`entityId` int NOT NULL,
	`propertyId` int,
	`tenantId` int,
	`name` varchar(255) NOT NULL,
	`category` enum('lease','addendum','notice','inspection','insurance','tax','maintenance','other') NOT NULL DEFAULT 'other',
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` text NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`shareToken` varchar(64),
	`shareExpiresAt` timestamp,
	`uploadedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `documents_shareToken_unique` UNIQUE(`shareToken`)
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
CREATE TABLE `inspections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int,
	`unitId` int,
	`type` enum('move_in','move_out','routine','drive_by','annual') NOT NULL DEFAULT 'routine',
	`scheduledDate` date,
	`completedDate` date,
	`status` enum('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`inspectorName` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inspections_id` PRIMARY KEY(`id`)
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
	`imageUrls` text,
	`adminImageUrls` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenance_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`plan` enum('trial','starter','pro','enterprise') NOT NULL DEFAULT 'trial',
	`trialEndsAt` timestamp,
	`timezone` varchar(100) NOT NULL DEFAULT 'America/Chicago',
	`logoUrl` text,
	`themePalette` enum('forest_slate','charcoal_sapphire','graphite_amber','stone_cobalt','midnight_teal','plum_lilac') NOT NULL DEFAULT 'forest_slate',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `owners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int,
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
	`orgId` int,
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
CREATE TABLE `prospects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(50),
	`propertyId` int,
	`unitId` int,
	`leadSource` enum('website','zillow','referral','walk_in','phone','social','other') NOT NULL DEFAULT 'website',
	`stage` enum('new','contacted','showing','application','approved','lost','leased') NOT NULL DEFAULT 'new',
	`notes` text,
	`assignedTo` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prospects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recurring_charges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leaseId` int NOT NULL,
	`account` varchar(100) NOT NULL,
	`description` varchar(500),
	`amount` decimal(12,2) NOT NULL,
	`frequency` enum('monthly','quarterly','yearly','weekly') NOT NULL DEFAULT 'monthly',
	`startDate` date NOT NULL,
	`endDate` date,
	`effectiveDate` date,
	`isIncrease` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recurring_charges_id` PRIMARY KEY(`id`)
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
CREATE TABLE `rental_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prospectId` int,
	`applicantName` varchar(255) NOT NULL,
	`applicantEmail` varchar(320),
	`applicantPhone` varchar(50),
	`propertyId` int,
	`unitId` int,
	`monthlyIncome` decimal(10,2),
	`desiredMoveIn` date,
	`status` enum('pending','screening','approved','denied','withdrawn') NOT NULL DEFAULT 'pending',
	`screeningScore` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rental_applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_updates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`message` text NOT NULL,
	`authorId` int,
	`authorName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_updates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('task','tenant_request','owner_request','internal') NOT NULL DEFAULT 'task',
	`requestKind` enum('general','maintenance') DEFAULT 'general',
	`title` varchar(255) NOT NULL,
	`description` text,
	`propertyId` int,
	`unitId` int,
	`tenantId` int,
	`category` enum('plumbing','electrical','hvac','appliance','structural','pest','cleaning','general','other') NOT NULL DEFAULT 'general',
	`priority` enum('urgent','high','medium','low') NOT NULL DEFAULT 'medium',
	`status` enum('not_started','in_progress','on_hold','completed','overdue') NOT NULL DEFAULT 'not_started',
	`assignedTo` int,
	`assigneeName` varchar(255),
	`dueDate` date,
	`aiSummary` text,
	`accessToProperty` boolean DEFAULT false,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int,
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
CREATE TABLE `transaction_line_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transactionId` int NOT NULL,
	`account` varchar(100) NOT NULL,
	`description` varchar(500),
	`amount` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transaction_line_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int,
	`type` enum('charge','payment','expense','deposit','credit','refund','bill','owner_contribution','owner_distribution','journal_entry','bank_transfer') NOT NULL,
	`date` date NOT NULL,
	`leaseId` int,
	`tenantId` int,
	`propertyId` int,
	`unitId` int,
	`vendorId` int,
	`ownerId` int,
	`bankAccountId` int,
	`category` varchar(100),
	`amount` decimal(12,2) NOT NULL,
	`description` varchar(500),
	`reference` varchar(100),
	`paymentMethod` enum('cash','check','credit_card','cashiers_check','money_order','eft','ach','debit_card'),
	`status` enum('pending','paid','partial','overdue','cleared','void','received') NOT NULL DEFAULT 'pending',
	`memo` text,
	`receiptUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
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
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin','tenant','manager') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	`passwordHash` varchar(255),
	`inviteToken` varchar(128),
	`inviteTokenExpiry` timestamp,
	`inviteUsed` int NOT NULL DEFAULT 0,
	`inviteReminderSentAt` timestamp,
	`orgId` int,
	`resetToken` varchar(128),
	`resetTokenExpiry` timestamp,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
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
CREATE TABLE `vendors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int,
	`name` varchar(255) NOT NULL,
	`company` varchar(255),
	`specialties` text,
	`preferredProvider` boolean NOT NULL DEFAULT false,
	`serviceAreas` text,
	`email` varchar(320),
	`phone` varchar(50),
	`category` enum('plumbing','electrical','hvac','general','landscaping','cleaning','pest','appliance','roofing','legal','accounting','other') NOT NULL DEFAULT 'general',
	`address` text,
	`taxId` varchar(100),
	`insuranceExpiry` date,
	`notes` text,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `work_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int,
	`vendorId` int,
	`propertyId` int,
	`unitId` int,
	`subject` varchar(255) NOT NULL,
	`workDescription` text,
	`isRecurring` boolean NOT NULL DEFAULT false,
	`startDate` date,
	`endDate` date,
	`frequency` enum('daily','weekly','biweekly','monthly','quarterly','yearly'),
	`dueDate` date,
	`priority` enum('urgent','high','medium','low') NOT NULL DEFAULT 'medium',
	`status` enum('open','in_progress','completed','cancelled') NOT NULL DEFAULT 'open',
	`assigneeName` varchar(255),
	`accessToProperty` boolean DEFAULT false,
	`approvedByOwner` boolean DEFAULT false,
	`billAmount` decimal(10,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `work_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_sentBy_users_id_fk` FOREIGN KEY (`sentBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `autopay_settings` ADD CONSTRAINT `autopay_settings_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `autopay_settings` ADD CONSTRAINT `autopay_settings_leaseId_leases_id_fk` FOREIGN KEY (`leaseId`) REFERENCES `leases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bank_accounts` ADD CONSTRAINT `bank_accounts_orgId_organizations_id_fk` FOREIGN KEY (`orgId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspections` ADD CONSTRAINT `inspections_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspections` ADD CONSTRAINT `inspections_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leases` ADD CONSTRAINT `leases_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leases` ADD CONSTRAINT `leases_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `maintenance_requests_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `maintenance_requests_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `owners` ADD CONSTRAINT `owners_orgId_organizations_id_fk` FOREIGN KEY (`orgId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `owners` ADD CONSTRAINT `owners_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_orgId_organizations_id_fk` FOREIGN KEY (`orgId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_ownerId_owners_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prospects` ADD CONSTRAINT `prospects_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prospects` ADD CONSTRAINT `prospects_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prospects` ADD CONSTRAINT `prospects_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recurring_charges` ADD CONSTRAINT `recurring_charges_leaseId_leases_id_fk` FOREIGN KEY (`leaseId`) REFERENCES `leases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rent_payments` ADD CONSTRAINT `rent_payments_leaseId_leases_id_fk` FOREIGN KEY (`leaseId`) REFERENCES `leases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rent_payments` ADD CONSTRAINT `rent_payments_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rental_applications` ADD CONSTRAINT `rental_applications_prospectId_prospects_id_fk` FOREIGN KEY (`prospectId`) REFERENCES `prospects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rental_applications` ADD CONSTRAINT `rental_applications_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rental_applications` ADD CONSTRAINT `rental_applications_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_updates` ADD CONSTRAINT `task_updates_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_updates` ADD CONSTRAINT `task_updates_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenants` ADD CONSTRAINT `tenants_orgId_organizations_id_fk` FOREIGN KEY (`orgId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenants` ADD CONSTRAINT `tenants_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transaction_line_items` ADD CONSTRAINT `transaction_line_items_transactionId_transactions_id_fk` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_orgId_organizations_id_fk` FOREIGN KEY (`orgId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_leaseId_leases_id_fk` FOREIGN KEY (`leaseId`) REFERENCES `leases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_ownerId_owners_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_bankAccountId_bank_accounts_id_fk` FOREIGN KEY (`bankAccountId`) REFERENCES `bank_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `units` ADD CONSTRAINT `units_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_orgId_organizations_id_fk` FOREIGN KEY (`orgId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_insurance_certificates` ADD CONSTRAINT `vendor_insurance_certificates_orgId_organizations_id_fk` FOREIGN KEY (`orgId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_insurance_certificates` ADD CONSTRAINT `vendor_insurance_certificates_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_performance_notes` ADD CONSTRAINT `vendor_performance_notes_orgId_organizations_id_fk` FOREIGN KEY (`orgId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_performance_notes` ADD CONSTRAINT `vendor_performance_notes_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_performance_notes` ADD CONSTRAINT `vendor_performance_notes_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendors` ADD CONSTRAINT `vendors_orgId_organizations_id_fk` FOREIGN KEY (`orgId`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;