ALTER TABLE `documents` ADD `category` enum('lease','addendum','notice','inspection','insurance','tax','maintenance','other') DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `category` enum('lease','addendum','notice','inspection','insurance','tax','maintenance','other') NOT NULL DEFAULT 'other';
ALTER TABLE `documents` ADD `fileName` varchar(255);
UPDATE `documents` SET `fileName` = `name` WHERE `fileName` IS NULL;
ALTER TABLE `documents` MODIFY `fileName` varchar(255) NOT NULL;
