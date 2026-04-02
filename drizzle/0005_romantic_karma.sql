CREATE TABLE `webchatAttachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionToken` varchar(128) NOT NULL,
	`conversationId` int,
	`messageId` int,
	`nup` varchar(64),
	`originalName` varchar(512) NOT NULL,
	`mimeType` varchar(128) NOT NULL,
	`fileSizeBytes` int NOT NULL,
	`s3Key` varchar(1024) NOT NULL,
	`s3Url` text NOT NULL,
	`uploadedByName` varchar(256),
	`isDeleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webchatAttachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `wca_session_idx` ON `webchatAttachments` (`sessionToken`);--> statement-breakpoint
CREATE INDEX `wca_conv_idx` ON `webchatAttachments` (`conversationId`);--> statement-breakpoint
CREATE INDEX `wca_nup_idx` ON `webchatAttachments` (`nup`);