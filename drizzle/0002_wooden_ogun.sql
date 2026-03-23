CREATE TABLE `adminProcesses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nup` varchar(32) NOT NULL,
	`originProtocolNup` varchar(32),
	`title` varchar(512) NOT NULL,
	`type` varchar(128) NOT NULL,
	`description` text,
	`legalBasis` text,
	`observations` text,
	`decision` text,
	`status` enum('open','in_analysis','pending_docs','in_progress','concluded','archived') NOT NULL DEFAULT 'open',
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`isConfidential` boolean NOT NULL DEFAULT false,
	`responsibleSectorId` int,
	`responsibleUserId` int,
	`createdById` int NOT NULL,
	`deadline` timestamp,
	`concludedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `adminProcesses_id` PRIMARY KEY(`id`),
	CONSTRAINT `adminProcesses_nup_unique` UNIQUE(`nup`)
);
--> statement-breakpoint
CREATE TABLE `aiProviders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('openai','gemini','anthropic','other') NOT NULL,
	`name` varchar(128) NOT NULL,
	`encryptedApiKey` text NOT NULL,
	`model` varchar(128),
	`isActive` boolean NOT NULL DEFAULT true,
	`allowedProfiles` json,
	`allowedSectors` json,
	`allowedDocTypes` json,
	`retainHistory` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aiProviders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aiUsageLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`userId` int NOT NULL,
	`nup` varchar(32),
	`entityType` varchar(64),
	`entityId` int,
	`prompt` text,
	`response` text,
	`action` varchar(128),
	`tokensUsed` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiUsageLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nup` varchar(32),
	`userId` int,
	`userName` varchar(255),
	`action` varchar(128) NOT NULL,
	`entity` varchar(64) NOT NULL,
	`entityId` int,
	`details` json,
	`ipAddress` varchar(64),
	`aiAssisted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documentTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('memo','official_letter','dispatch','opinion','notification','certificate','report','response','other') NOT NULL,
	`content` text NOT NULL,
	`variables` json,
	`sectorId` int,
	`createdById` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documentTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `electronicSignatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`nup` varchar(32),
	`signerId` int NOT NULL,
	`signerName` varchar(255) NOT NULL,
	`signerEmail` varchar(320),
	`signerRole` varchar(128),
	`ipAddress` varchar(64),
	`documentHash` varchar(256),
	`signedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `electronicSignatures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nupCounter` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`sequence` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nupCounter_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `officialDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nup` varchar(32),
	`protocolId` int,
	`processId` int,
	`type` enum('memo','official_letter','dispatch','opinion','notification','certificate','report','other') NOT NULL,
	`number` varchar(64) NOT NULL,
	`title` varchar(512) NOT NULL,
	`content` text,
	`authorId` int NOT NULL,
	`sectorId` int,
	`status` enum('draft','pending_signature','signed','published','archived') NOT NULL DEFAULT 'draft',
	`isConfidential` boolean NOT NULL DEFAULT false,
	`aiGenerated` boolean NOT NULL DEFAULT false,
	`fileUrl` text,
	`issuedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `officialDocuments_id` PRIMARY KEY(`id`),
	CONSTRAINT `officialDocuments_nup_unique` UNIQUE(`nup`),
	CONSTRAINT `officialDocuments_number_unique` UNIQUE(`number`)
);
--> statement-breakpoint
CREATE TABLE `ombudsmanManifestations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nup` varchar(32) NOT NULL,
	`type` enum('complaint','denounce','praise','suggestion','request','esic') NOT NULL,
	`subject` varchar(512) NOT NULL,
	`description` text NOT NULL,
	`isAnonymous` boolean NOT NULL DEFAULT false,
	`requesterName` varchar(255),
	`requesterEmail` varchar(320),
	`requesterPhone` varchar(64),
	`requesterCpfCnpj` varchar(18),
	`isConfidential` boolean NOT NULL DEFAULT false,
	`status` enum('received','in_analysis','in_progress','answered','archived') NOT NULL DEFAULT 'received',
	`responsibleSectorId` int,
	`responsibleUserId` int,
	`response` text,
	`respondedAt` timestamp,
	`deadline` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ombudsmanManifestations_id` PRIMARY KEY(`id`),
	CONSTRAINT `ombudsmanManifestations_nup_unique` UNIQUE(`nup`)
);
--> statement-breakpoint
CREATE TABLE `protocols` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nup` varchar(32) NOT NULL,
	`conversationId` int,
	`contactId` int,
	`requesterName` varchar(255),
	`requesterEmail` varchar(320),
	`requesterPhone` varchar(64),
	`requesterCpfCnpj` varchar(18),
	`subject` varchar(512) NOT NULL,
	`description` text,
	`type` enum('request','complaint','information','suggestion','praise','ombudsman','esic','administrative') NOT NULL DEFAULT 'request',
	`channel` enum('whatsapp','instagram','email','web','phone','in_person') NOT NULL DEFAULT 'web',
	`status` enum('open','in_analysis','pending_docs','in_progress','concluded','archived') NOT NULL DEFAULT 'open',
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`isConfidential` boolean NOT NULL DEFAULT false,
	`responsibleSectorId` int,
	`responsibleUserId` int,
	`createdById` int,
	`deadline` timestamp,
	`concludedAt` timestamp,
	`parentNup` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `protocols_id` PRIMARY KEY(`id`),
	CONSTRAINT `protocols_nup_unique` UNIQUE(`nup`)
);
--> statement-breakpoint
CREATE TABLE `sectors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(32) NOT NULL,
	`description` text,
	`parentId` int,
	`managerId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sectors_id` PRIMARY KEY(`id`),
	CONSTRAINT `sectors_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `tramitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`protocolId` int NOT NULL,
	`nup` varchar(32) NOT NULL,
	`fromSectorId` int,
	`toSectorId` int,
	`fromUserId` int,
	`toUserId` int,
	`action` enum('forward','return','assign','conclude','archive','reopen','comment') NOT NULL,
	`dispatch` text,
	`attachments` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tramitations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `type` enum('new_message','ticket_assigned','ticket_resolved','queue_assigned','mention','protocol_update','tramitation','signature_request') NOT NULL;--> statement-breakpoint
ALTER TABLE `contacts` ADD `cpfCnpj` varchar(18);--> statement-breakpoint
ALTER TABLE `conversations` ADD `nup` varchar(32);--> statement-breakpoint
ALTER TABLE `conversations` ADD `assignedSectorId` int;--> statement-breakpoint
ALTER TABLE `messages` ADD `aiGenerated` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` ADD `relatedProtocolId` int;--> statement-breakpoint
ALTER TABLE `notifications` ADD `nup` varchar(32);--> statement-breakpoint
ALTER TABLE `tickets` ADD `nup` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `profile` enum('citizen','attendant','sector_server','manager','admin') DEFAULT 'attendant' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `sectorId` int;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_nup_unique` UNIQUE(`nup`);