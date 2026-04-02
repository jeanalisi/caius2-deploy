CREATE TABLE `customModuleRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`moduleId` int NOT NULL,
	`nup` varchar(32),
	`title` varchar(256) NOT NULL,
	`status` varchar(64) NOT NULL DEFAULT 'open',
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`assignedTo` int,
	`sectorId` int,
	`data` json,
	`content` text,
	`isConfidential` boolean NOT NULL DEFAULT false,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customModuleRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customModules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`description` text,
	`icon` varchar(64) DEFAULT 'FileText',
	`color` varchar(32) DEFAULT '#6366f1',
	`menuSection` varchar(64) DEFAULT 'gestao-publica',
	`menuOrder` int DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`fields` json,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customModules_id` PRIMARY KEY(`id`),
	CONSTRAINT `customModules_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE INDEX `cmr_module_idx` ON `customModuleRecords` (`moduleId`);--> statement-breakpoint
CREATE INDEX `cmr_nup_idx` ON `customModuleRecords` (`nup`);