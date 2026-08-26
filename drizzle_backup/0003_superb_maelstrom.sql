ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `inviteToken` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `inviteTokenExpiry` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `inviteUsed` int DEFAULT 0 NOT NULL;