CREATE TABLE `attachmentConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceTypeId` int,
	`formTemplateId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`acceptedTypes` json,
	`maxFileSizeMb` int NOT NULL DEFAULT 10,
	`maxTotalSizeMb` int NOT NULL DEFAULT 50,
	`minCount` int NOT NULL DEFAULT 0,
	`maxCount` int NOT NULL DEFAULT 10,
	`isRequired` boolean NOT NULL DEFAULT false,
	`allowedAtStages` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attachmentConfigs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nup` varchar(32),
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`configId` int,
	`uploadedById` int NOT NULL,
	`fileName` varchar(512) NOT NULL,
	`originalName` varchar(512) NOT NULL,
	`mimeType` varchar(128) NOT NULL,
	`fileSizeBytes` bigint NOT NULL,
	`s3Key` varchar(1024) NOT NULL,
	`s3Url` text NOT NULL,
	`category` varchar(128),
	`version` int NOT NULL DEFAULT 1,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contextHelp` (
	`id` int AUTO_INCREMENT NOT NULL,
	`featureKey` varchar(128) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`detailedInstructions` text,
	`examples` text,
	`requiredDocuments` text,
	`warnings` text,
	`usefulLinks` json,
	`normativeBase` text,
	`targetProfiles` json,
	`displayMode` enum('tooltip','modal','sidebar','expandable') NOT NULL DEFAULT 'modal',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contextHelp_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `formFields` (
	`id` int AUTO_INCREMENT NOT NULL,
	`formTemplateId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`label` varchar(255) NOT NULL,
	`fieldType` enum('text','textarea','number','currency','cpf','cnpj','rg','matricula','email','phone','date','time','datetime','address','cep','neighborhood','city','state','select','multiselect','checkbox','radio','dependent_list','file_upload','image','selfie','geolocation','map','calculated','hidden','signature','acknowledgment') NOT NULL,
	`placeholder` varchar(255),
	`helpText` text,
	`isRequired` boolean NOT NULL DEFAULT false,
	`defaultValue` text,
	`mask` varchar(128),
	`maxLength` int,
	`validationRegex` varchar(512),
	`options` json,
	`conditionalRule` json,
	`visibleToProfiles` json,
	`editableByProfiles` json,
	`isReadOnly` boolean NOT NULL DEFAULT false,
	`sectionName` varchar(128),
	`displayOrder` int NOT NULL DEFAULT 0,
	`dependsOnFieldId` int,
	`autoFill` varchar(128),
	`isReusable` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `formFields_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `formTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceTypeId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`version` int NOT NULL DEFAULT 1,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `formTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `institutionalConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` text,
	`type` enum('text','color','url','boolean','json') NOT NULL DEFAULT 'text',
	`label` varchar(255),
	`description` text,
	`updatedById` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `institutionalConfig_id` PRIMARY KEY(`id`),
	CONSTRAINT `institutionalConfig_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `onlineSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionToken` varchar(256) NOT NULL,
	`ipAddress` varchar(64),
	`userAgent` text,
	`channel` varchar(64) NOT NULL DEFAULT 'web',
	`currentPage` varchar(512),
	`lastActivity` timestamp NOT NULL DEFAULT (now()),
	`isActive` boolean NOT NULL DEFAULT true,
	`terminatedById` int,
	`terminatedAt` timestamp,
	`loginAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `onlineSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `onlineSessions_sessionToken_unique` UNIQUE(`sessionToken`)
);
--> statement-breakpoint
CREATE TABLE `searchIndex` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`nup` varchar(32),
	`title` varchar(512) NOT NULL,
	`content` text,
	`tags` json,
	`visibleToProfiles` json,
	`isPublic` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `searchIndex_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `serviceTypes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(128),
	`code` varchar(64),
	`initialSectorId` int,
	`slaResponseHours` int,
	`slaConclusionHours` int,
	`secrecyLevel` enum('public','restricted','confidential','secret') NOT NULL DEFAULT 'public',
	`requiresApproval` boolean NOT NULL DEFAULT false,
	`canConvertToProcess` boolean NOT NULL DEFAULT false,
	`allowPublicConsult` boolean NOT NULL DEFAULT true,
	`requiresSelfie` boolean NOT NULL DEFAULT false,
	`requiresGeolocation` boolean NOT NULL DEFAULT false,
	`requiresStrongAuth` boolean NOT NULL DEFAULT false,
	`defaultResponseTemplateId` int,
	`allowedProfiles` json,
	`flowConfig` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `serviceTypes_id` PRIMARY KEY(`id`),
	CONSTRAINT `serviceTypes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `userRegistrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`email` varchar(320) NOT NULL,
	`passwordHash` text NOT NULL,
	`cpf` varchar(14),
	`cnpj` varchar(18),
	`phone` varchar(20),
	`googleId` varchar(128),
	`emailVerified` boolean NOT NULL DEFAULT false,
	`emailVerifyToken` varchar(256),
	`passwordResetToken` varchar(256),
	`passwordResetExpiry` timestamp,
	`termsAcceptedAt` timestamp,
	`mfaEnabled` boolean NOT NULL DEFAULT false,
	`mfaSecret` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userRegistrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `userRegistrations_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `entity_idx` ON `searchIndex` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `nup_idx` ON `searchIndex` (`nup`);