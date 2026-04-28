CREATE TABLE `bidFiles` (
  `id` int AUTO_INCREMENT NOT NULL,
  `bidId` int NOT NULL,
  `userId` int NOT NULL,
  `originalName` varchar(255) NOT NULL,
  `storedName` varchar(255) NOT NULL,
  `mimeType` varchar(120),
  `sizeBytes` int NOT NULL,
  `storagePath` varchar(500) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `bidFiles_id` PRIMARY KEY(`id`)
);
