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
CREATE TABLE `vendors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`company` varchar(255),
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
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspections` ADD CONSTRAINT `inspections_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspections` ADD CONSTRAINT `inspections_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prospects` ADD CONSTRAINT `prospects_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prospects` ADD CONSTRAINT `prospects_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prospects` ADD CONSTRAINT `prospects_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recurring_charges` ADD CONSTRAINT `recurring_charges_leaseId_leases_id_fk` FOREIGN KEY (`leaseId`) REFERENCES `leases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rental_applications` ADD CONSTRAINT `rental_applications_prospectId_prospects_id_fk` FOREIGN KEY (`prospectId`) REFERENCES `prospects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rental_applications` ADD CONSTRAINT `rental_applications_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rental_applications` ADD CONSTRAINT `rental_applications_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_updates` ADD CONSTRAINT `task_updates_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_updates` ADD CONSTRAINT `task_updates_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transaction_line_items` ADD CONSTRAINT `transaction_line_items_transactionId_transactions_id_fk` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_leaseId_leases_id_fk` FOREIGN KEY (`leaseId`) REFERENCES `leases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_ownerId_owners_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_bankAccountId_bank_accounts_id_fk` FOREIGN KEY (`bankAccountId`) REFERENCES `bank_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;