CREATE TABLE `documentSignatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`verifiableDocumentId` int NOT NULL,
	`nup` varchar(32),
	`signerId` int NOT NULL,
	`signerName` varchar(255) NOT NULL,
	`signerCpfMasked` varchar(20),
	`signerRole` varchar(128),
	`signerUnit` varchar(256),
	`signatureType` enum('institutional','advanced','qualified') NOT NULL DEFAULT 'institutional',
	`signatureMethod` varchar(128) DEFAULT 'CAIUS-INSTITUTIONAL',
	`documentHash` varchar(256),
	`signatureHash` varchar(256),
	`certificate` text,
	`certIssuer` varchar(512),
	`algorithm` varchar(64) DEFAULT 'SHA-256',
	`ipAddress` varchar(64),
	`userAgent` text,
	`accessCode` varchar(128) NOT NULL,
	`verificationUrl` varchar(1024),
	`status` enum('valid','invalid','altered','revoked','expired','replaced') NOT NULL DEFAULT 'valid',
	`signedAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	`revocationReason` text,
	`signatureOrder` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documentSignatures_id` PRIMARY KEY(`id`),
	CONSTRAINT `documentSignatures_accessCode_unique` UNIQUE(`accessCode`)
);
--> statement-breakpoint
CREATE TABLE `documentVerificationLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`verifiableDocumentId` int,
	`verificationKey` varchar(128),
	`accessCode` varchar(128),
	`queryType` enum('nup','key','qrcode','link') NOT NULL DEFAULT 'key',
	`ipAddress` varchar(64),
	`userAgent` text,
	`result` enum('found','not_found','invalid') NOT NULL DEFAULT 'found',
	`accessedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documentVerificationLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verifiableDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` enum('protocol','process','document','ombudsman','template','receipt','report','custom') NOT NULL,
	`entityId` int NOT NULL,
	`nup` varchar(32),
	`verificationKey` varchar(128) NOT NULL,
	`documentHash` varchar(256),
	`title` varchar(512) NOT NULL,
	`documentType` varchar(128) NOT NULL,
	`documentNumber` varchar(64),
	`issuingUnit` varchar(256),
	`issuingUserId` int,
	`issuingUserName` varchar(255),
	`status` enum('authentic','invalid','cancelled','replaced','revoked','unavailable') NOT NULL DEFAULT 'authentic',
	`version` int NOT NULL DEFAULT 1,
	`replacedById` int,
	`verificationUrl` varchar(1024),
	`qrCodeData` text,
	`isPublic` boolean NOT NULL DEFAULT true,
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`invalidatedAt` timestamp,
	`invalidationReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verifiableDocuments_id` PRIMARY KEY(`id`),
	CONSTRAINT `verifiableDocuments_verificationKey_unique` UNIQUE(`verificationKey`)
);
--> statement-breakpoint
CREATE INDEX `ds_doc_idx` ON `documentSignatures` (`verifiableDocumentId`);--> statement-breakpoint
CREATE INDEX `ds_code_idx` ON `documentSignatures` (`accessCode`);--> statement-breakpoint
CREATE INDEX `ds_signer_idx` ON `documentSignatures` (`signerId`);--> statement-breakpoint
CREATE INDEX `vd_key_idx` ON `verifiableDocuments` (`verificationKey`);--> statement-breakpoint
CREATE INDEX `vd_nup_idx` ON `verifiableDocuments` (`nup`);--> statement-breakpoint
CREATE INDEX `vd_entity_idx` ON `verifiableDocuments` (`entityType`,`entityId`);