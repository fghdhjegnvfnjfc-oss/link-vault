-- Create vault table
CREATE TABLE `vault` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vaultPassword` varchar(255) NOT NULL,
	`ownerPassword` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vault_id` PRIMARY KEY(`id`)
);

-- Create folders table
CREATE TABLE `folders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`icon` varchar(10),
	`color` varchar(50),
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `folders_id` PRIMARY KEY(`id`)
);

-- Create links table
CREATE TABLE `links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`folderId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`description` text,
	`isPasswordProtected` boolean NOT NULL DEFAULT false,
	`password` varchar(255),
	`displayOrder` int NOT NULL DEFAULT 0,
	`clickCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `links_id` PRIMARY KEY(`id`),
	CONSTRAINT `links_folderId_fk` FOREIGN KEY (`folderId`) REFERENCES `folders`(`id`) ON DELETE CASCADE
);
