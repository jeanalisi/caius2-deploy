CREATE TABLE `doc_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`controlId` int NOT NULL,
	`userId` int NOT NULL,
	`doc_audit_action` enum('manual_number_change','control_created','control_updated','control_activated','control_deactivated','number_used') NOT NULL,
	`previousValue` text,
	`newValue` text,
	`justification` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `doc_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `doc_organizational_units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`acronym` varchar(50),
	`doc_org_unit_type` enum('secretaria','setor','gabinete','departamento','coordenacao','outro') NOT NULL,
	`parentId` int,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `doc_organizational_units_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `docRecipients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`originType` enum('internal','external') NOT NULL DEFAULT 'external',
	`recipientUserId` int,
	`recipientUnitId` int,
	`recipientName` varchar(255),
	`recipientEmail` varchar(320),
	`recipientPhone` varchar(64),
	`channel` enum('email','whatsapp','both') NOT NULL DEFAULT 'email',
	`status` enum('pending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`sentAt` timestamp,
	`pdfUrl` text,
	`sentById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `docRecipients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `doc_user_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`canAccessOficios` boolean NOT NULL DEFAULT false,
	`canAccessMemorandos` boolean NOT NULL DEFAULT false,
	`canAccessDecretos` boolean NOT NULL DEFAULT false,
	`canAccessLeis` boolean NOT NULL DEFAULT false,
	`canAccessDiarioOficial` boolean NOT NULL DEFAULT false,
	`canAccessContratos` boolean NOT NULL DEFAULT false,
	`canAccessPortarias` boolean NOT NULL DEFAULT false,
	`grantedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `doc_user_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `doc_user_units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`unitId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `doc_user_units_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_controls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`documentType` enum('oficio','memorando','decreto','lei','diario_oficial','contrato','portaria') NOT NULL,
	`unitId` int NOT NULL,
	`prefix` varchar(50),
	`numberFormat` enum('sequencial','ano_sequencial','sequencial_ano') NOT NULL DEFAULT 'sequencial',
	`digits` int NOT NULL DEFAULT 4,
	`referenceYear` int NOT NULL,
	`resetAnnually` boolean NOT NULL DEFAULT true,
	`nextNumber` int NOT NULL DEFAULT 1,
	`active` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `document_controls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `number_usages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`controlId` int NOT NULL,
	`number` int NOT NULL,
	`formattedNumber` varchar(100) NOT NULL,
	`documentDescription` text,
	`usedBy` int NOT NULL,
	`usedAt` timestamp NOT NULL DEFAULT (now()),
	`year` int NOT NULL,
	CONSTRAINT `number_usages_id` PRIMARY KEY(`id`)
);
