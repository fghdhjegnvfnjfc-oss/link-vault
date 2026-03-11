CREATE TABLE `activeSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vaultId` int NOT NULL,
	`userId` int NOT NULL,
	`sessionId` varchar(255) NOT NULL,
	`userColor` varchar(50) NOT NULL,
	`isOnline` boolean NOT NULL DEFAULT true,
	`lastHeartbeat` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activeSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `activeSessions_sessionId_unique` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE TABLE `auditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vaultId` int NOT NULL,
	`userId` int NOT NULL,
	`action` enum('link_created','link_updated','link_deleted','link_accessed','folder_created','folder_updated','folder_deleted','member_added','member_removed','vault_settings_changed') NOT NULL,
	`resourceType` enum('link','folder','vault','member') NOT NULL,
	`resourceId` int,
	`resourceName` text,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `editState` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vaultId` int NOT NULL,
	`sessionId` varchar(255) NOT NULL,
	`userId` int NOT NULL,
	`resourceType` enum('link','folder') NOT NULL,
	`resourceId` int NOT NULL,
	`fieldName` varchar(100),
	`currentValue` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`lastUpdate` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `editState_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `folders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vaultId` int NOT NULL,
	`name` text NOT NULL,
	`icon` varchar(10) NOT NULL DEFAULT '📁',
	`color` varchar(50) NOT NULL DEFAULT 'oklch(0.65 0.18 200)',
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `folders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`folderId` int NOT NULL,
	`vaultId` int NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`description` text,
	`isPasswordProtected` boolean NOT NULL DEFAULT false,
	`password` varchar(255),
	`displayOrder` int NOT NULL DEFAULT 0,
	`clickCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `vaultMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vaultId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','editor','viewer') NOT NULL DEFAULT 'editor',
	`adminPassword` varchar(255),
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vaultMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vaults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`vaultPassword` varchar(255) NOT NULL,
	`isPublic` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vaults_id` PRIMARY KEY(`id`)
);
