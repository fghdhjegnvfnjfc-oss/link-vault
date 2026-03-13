CREATE TABLE `bannedUsers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vaultId` int NOT NULL,
	`userId` int NOT NULL,
	`sessionId` varchar(255) NOT NULL,
	`reason` text,
	`bannedBy` int NOT NULL,
	`bannedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bannedUsers_id` PRIMARY KEY(`id`)
);
