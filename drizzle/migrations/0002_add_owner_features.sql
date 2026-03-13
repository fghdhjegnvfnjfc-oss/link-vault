CREATE TABLE IF NOT EXISTS `ownerPasswords` (
  `id` int AUTO_INCREMENT NOT NULL,
  `vaultId` int NOT NULL,
  `ownerPassword` varchar(255) NOT NULL,
  `adminPassword` varchar(255) NOT NULL,
  `vaultPassword` varchar(255) NOT NULL,
  `changedAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `changedBy` int,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `changeHistory` (
  `id` int AUTO_INCREMENT NOT NULL,
  `vaultId` int NOT NULL,
  `changeType` enum('link_created','link_updated','link_deleted','folder_created','folder_updated','folder_deleted') NOT NULL,
  `resourceType` enum('link','folder') NOT NULL,
  `resourceId` int NOT NULL,
  `resourceName` text,
  `previousState` json,
  `newState` json,
  `changedBy` int,
  `changedAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;
