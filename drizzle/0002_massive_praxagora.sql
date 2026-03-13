CREATE TABLE `adminAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`password` varchar(255) NOT NULL,
	`isApproved` boolean NOT NULL DEFAULT false,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `adminAccounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `adminAccounts_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `pendingAdminApprovals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`respondedAt` timestamp,
	CONSTRAINT `pendingAdminApprovals_id` PRIMARY KEY(`id`),
	CONSTRAINT `pendingAdminApprovals_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `vault` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vaultPassword` varchar(255) NOT NULL,
	`ownerPassword` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vault_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `editState`;--> statement-breakpoint
DROP TABLE `vaultMembers`;--> statement-breakpoint
DROP TABLE `vaults`;--> statement-breakpoint
ALTER TABLE `auditLog` MODIFY COLUMN `action` enum('link_created','link_updated','link_deleted','link_accessed','link_password_set','folder_created','folder_updated','folder_deleted','vault_password_changed','admin_account_created','admin_account_removed','admin_password_changed') NOT NULL;--> statement-breakpoint
ALTER TABLE `auditLog` MODIFY COLUMN `resourceType` enum('link','folder','vault','admin') NOT NULL;--> statement-breakpoint
ALTER TABLE `bannedUsers` MODIFY COLUMN `bannedBy` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `activeSessions` ADD `userEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `auditLog` ADD `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `bannedUsers` ADD CONSTRAINT `bannedUsers_sessionId_unique` UNIQUE(`sessionId`);--> statement-breakpoint
ALTER TABLE `activeSessions` DROP COLUMN `vaultId`;--> statement-breakpoint
ALTER TABLE `activeSessions` DROP COLUMN `userId`;--> statement-breakpoint
ALTER TABLE `auditLog` DROP COLUMN `vaultId`;--> statement-breakpoint
ALTER TABLE `auditLog` DROP COLUMN `userId`;--> statement-breakpoint
ALTER TABLE `bannedUsers` DROP COLUMN `vaultId`;--> statement-breakpoint
ALTER TABLE `bannedUsers` DROP COLUMN `userId`;--> statement-breakpoint
ALTER TABLE `folders` DROP COLUMN `vaultId`;--> statement-breakpoint
ALTER TABLE `links` DROP COLUMN `vaultId`;