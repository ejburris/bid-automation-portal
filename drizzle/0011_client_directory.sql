CREATE TABLE `clients` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `clientCompany` varchar(255) NOT NULL,
  `contactName` varchar(255),
  `phone` varchar(20),
  `email` varchar(320),
  `officePhone` varchar(20),
  `address` varchar(255),
  `city` varchar(100),
  `state` varchar(2),
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);--> statement-breakpoint

ALTER TABLE `clients` ADD CONSTRAINT `clients_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bids` ADD `clientOfficePhone` varchar(20);--> statement-breakpoint
ALTER TABLE `bids` ADD `clientAddress` varchar(255);--> statement-breakpoint
ALTER TABLE `bids` ADD `clientCity` varchar(100);--> statement-breakpoint
ALTER TABLE `bids` ADD `clientState` varchar(2);--> statement-breakpoint
ALTER TABLE `bids` ADD `clientNotes` text;
