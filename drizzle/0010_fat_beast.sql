CREATE TABLE `audioTranscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` int,
	`conversationId` int,
	`contactId` int,
	`protocolId` int,
	`nup` varchar(64),
	`audioUrl` varchar(1024),
	`provider` varchar(64) DEFAULT 'whisper',
	`transcriptionText` text,
	`language` varchar(16),
	`confidence` varchar(16),
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`durationSeconds` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `audioTranscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `channelHealthLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`channel` enum('whatsapp','instagram','email') NOT NULL,
	`status` enum('healthy','degraded','unhealthy','unknown') NOT NULL DEFAULT 'unknown',
	`latencyMs` int,
	`errorMessage` text,
	`checkedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `channelHealthLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `channelSyncState` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`channel` enum('whatsapp','instagram','email') NOT NULL,
	`lastCursor` varchar(512),
	`lastMessageAt` timestamp,
	`lastSyncAt` timestamp,
	`status` enum('idle','syncing','error','disconnected') NOT NULL DEFAULT 'idle',
	`errorMessage` text,
	`syncCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `channelSyncState_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deliveryAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int,
	`protocolId` int,
	`nup` varchar(64),
	`channel` enum('whatsapp','instagram','email') NOT NULL,
	`accountId` int NOT NULL,
	`recipient` varchar(512) NOT NULL,
	`eventType` varchar(128) NOT NULL,
	`payload` text,
	`status` enum('pending','sent','failed','retrying','cancelled') NOT NULL DEFAULT 'pending',
	`attemptNumber` int NOT NULL DEFAULT 1,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`sentAt` timestamp,
	`nextRetryAt` timestamp,
	CONSTRAINT `deliveryAttempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messageEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` int,
	`conversationId` int,
	`eventType` varchar(128) NOT NULL,
	`channel` enum('whatsapp','instagram','email') NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messageEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `surveyDispatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`protocolId` int,
	`nup` varchar(64),
	`channel` enum('whatsapp','instagram','email') NOT NULL,
	`accountId` int NOT NULL,
	`recipient` varchar(512) NOT NULL,
	`status` enum('pending','sent','responded','failed','expired') NOT NULL DEFAULT 'pending',
	`surveyToken` varchar(128),
	`rating` int,
	`feedback` text,
	`sentAt` timestamp,
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `surveyDispatches_id` PRIMARY KEY(`id`),
	CONSTRAINT `surveyDispatches_surveyToken_unique` UNIQUE(`surveyToken`)
);
--> statement-breakpoint
CREATE INDEX `at_msg_idx` ON `audioTranscriptions` (`messageId`);--> statement-breakpoint
CREATE INDEX `at_conv_idx` ON `audioTranscriptions` (`conversationId`);--> statement-breakpoint
CREATE INDEX `at_status_idx` ON `audioTranscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `chl_account_idx` ON `channelHealthLogs` (`accountId`);--> statement-breakpoint
CREATE INDEX `chl_checked_idx` ON `channelHealthLogs` (`checkedAt`);--> statement-breakpoint
CREATE INDEX `css_account_channel_idx` ON `channelSyncState` (`accountId`,`channel`);--> statement-breakpoint
CREATE INDEX `da_conv_idx` ON `deliveryAttempts` (`conversationId`);--> statement-breakpoint
CREATE INDEX `da_status_idx` ON `deliveryAttempts` (`status`);--> statement-breakpoint
CREATE INDEX `da_event_idx` ON `deliveryAttempts` (`eventType`);--> statement-breakpoint
CREATE INDEX `me_msg_idx` ON `messageEvents` (`messageId`);--> statement-breakpoint
CREATE INDEX `me_conv_idx` ON `messageEvents` (`conversationId`);--> statement-breakpoint
CREATE INDEX `me_type_idx` ON `messageEvents` (`eventType`);--> statement-breakpoint
CREATE INDEX `sd_conv_idx` ON `surveyDispatches` (`conversationId`);--> statement-breakpoint
CREATE INDEX `sd_status_idx` ON `surveyDispatches` (`status`);