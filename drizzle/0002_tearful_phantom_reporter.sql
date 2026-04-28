CREATE TABLE `emailQueue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`to` varchar(320) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`status` enum('pending','sent','failed','scheduled') NOT NULL DEFAULT 'pending',
	`scheduledFor` timestamp,
	`sentAt` timestamp,
	`failureReason` text,
	`retryCount` int NOT NULL DEFAULT 0,
	`maxRetries` int NOT NULL DEFAULT 3,
	`bidId` int,
	`projectId` int,
	`emailType` varchar(50) NOT NULL,
	`attachmentPath` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailQueue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `emailQueue` ADD CONSTRAINT `emailQueue_bidId_bids_id_fk` FOREIGN KEY (`bidId`) REFERENCES `bids`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emailQueue` ADD CONSTRAINT `emailQueue_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;