ALTER TABLE `projects` ADD `address` varchar(255);--> statement-breakpoint
ALTER TABLE `projects` ADD `city` varchar(100);--> statement-breakpoint
ALTER TABLE `projects` ADD `state` varchar(2);--> statement-breakpoint
ALTER TABLE `projects` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `externalId` varchar(255);--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `source` enum('buildingconnected','plancenter','procore','email');--> statement-breakpoint
ALTER TABLE `bids` ADD `clientCompany` varchar(255);--> statement-breakpoint
ALTER TABLE `bids` ADD `contactName` varchar(255);--> statement-breakpoint
ALTER TABLE `bids` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `bids` ADD `email` varchar(320);
