ALTER TABLE `bids` ADD `projectName` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `bids` ADD `projectAddress` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `bids` ADD `projectSqft` int;--> statement-breakpoint
ALTER TABLE `bids` ADD `crewDays` int NOT NULL;--> statement-breakpoint
ALTER TABLE `bids` ADD `crewPeople` int NOT NULL;--> statement-breakpoint
ALTER TABLE `bids` ADD `isPrivateWage` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `bids` ADD `travelDistance` int;--> statement-breakpoint
ALTER TABLE `bids` ADD `additionalCosts` int;--> statement-breakpoint
ALTER TABLE `bids` ADD `includeWaxing` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bids` ADD `includeCarpet` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bids` ADD `includeWindows` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bids` DROP COLUMN `wageType`;--> statement-breakpoint
ALTER TABLE `bids` DROP COLUMN `includeTravel`;