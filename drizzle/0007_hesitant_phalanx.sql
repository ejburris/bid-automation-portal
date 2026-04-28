ALTER TABLE `bids` ADD `waxingSqft` int;--> statement-breakpoint
ALTER TABLE `bids` ADD `carpetSqft` int;--> statement-breakpoint
ALTER TABLE `bids` ADD `windowCount` int;--> statement-breakpoint
ALTER TABLE `bids` ADD `floorCount` int;--> statement-breakpoint
ALTER TABLE `bids` ADD `needsAerialLift` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bids` ADD `aerialLiftCost` int;