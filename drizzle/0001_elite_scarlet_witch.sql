CREATE TABLE `addendums` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bidId` int NOT NULL,
	`projectId` int NOT NULL,
	`addendumNumber` varchar(50) NOT NULL,
	`receivedAt` timestamp NOT NULL,
	`description` text,
	`impactAssessment` text,
	`quotAdjustmentNeeded` int NOT NULL,
	`adjustmentAmount` int,
	`acknowledgmentStatus` enum('pending','acknowledged','sent') NOT NULL DEFAULT 'pending',
	`acknowledgedAt` timestamp,
	`documentUrls` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `addendums_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bidParameters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyName` varchar(255),
	`baseLocation` varchar(255),
	`privateWageHourly` int NOT NULL,
	`workDayHours` int NOT NULL DEFAULT 9,
	`costPerSqftPrivate` int,
	`cleaningCostPerHour` int,
	`windowWashingCostPerHour` int,
	`waxingCostPerHour` int,
	`travelCostPerMile` int,
	`hotelCostPerNight` int,
	`perDiem` int,
	`additionalCostPercentage` int NOT NULL DEFAULT 6,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bidParameters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bids` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('draft','submitted','approved','awarded','lost','withdrawn') NOT NULL DEFAULT 'draft',
	`bidAmount` int,
	`wageType` enum('private','prevailing') NOT NULL DEFAULT 'private',
	`includeTravel` int NOT NULL DEFAULT 0,
	`travelCost` int,
	`submittedAt` timestamp,
	`awardedAt` timestamp,
	`followUpDueAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bids_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `followUpSchedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bidId` int NOT NULL,
	`scheduleType` enum('initial','first_followup','second_followup','custom') NOT NULL,
	`scheduledFor` timestamp NOT NULL,
	`sentAt` timestamp,
	`status` enum('pending','sent','failed','cancelled') NOT NULL DEFAULT 'pending',
	`reminderMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `followUpSchedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integrationStatus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` enum('outlook','buildingconnected','plancenter','procore') NOT NULL,
	`isConnected` int NOT NULL DEFAULT 0,
	`lastSyncAt` timestamp,
	`lastErrorMessage` text,
	`connectionDetails` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integrationStatus_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prevailingWageRates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jurisdiction` varchar(255) NOT NULL,
	`county` varchar(255),
	`state` varchar(2) NOT NULL,
	`effectiveDate` timestamp NOT NULL,
	`wageRate` int NOT NULL,
	`fringeRate` int,
	`totalRate` int NOT NULL,
	`minimumBid` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prevailingWageRates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(255) NOT NULL,
	`source` enum('buildingconnected','plancenter','procore','email') NOT NULL,
	`projectName` varchar(255) NOT NULL,
	`location` varchar(255),
	`squareFootage` int,
	`dueDate` timestamp,
	`requiresPrevailingWage` int NOT NULL DEFAULT 0,
	`wageEffectiveDate` timestamp,
	`jurisdiction` varchar(255),
	`contactName` varchar(255),
	`contactEmail` varchar(320),
	`contactPhone` varchar(20),
	`scopeOfWork` text,
	`documentUrls` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `projects_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
ALTER TABLE `addendums` ADD CONSTRAINT `addendums_bidId_bids_id_fk` FOREIGN KEY (`bidId`) REFERENCES `bids`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `addendums` ADD CONSTRAINT `addendums_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bidParameters` ADD CONSTRAINT `bidParameters_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bids` ADD CONSTRAINT `bids_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `followUpSchedules` ADD CONSTRAINT `followUpSchedules_bidId_bids_id_fk` FOREIGN KEY (`bidId`) REFERENCES `bids`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `integrationStatus` ADD CONSTRAINT `integrationStatus_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;