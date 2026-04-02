CREATE TABLE `webchatSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionToken` varchar(128) NOT NULL,
	`conversationId` int,
	`contactId` int,
	`accountId` int,
	`visitorName` varchar(256),
	`visitorEmail` varchar(320),
	`visitorPhone` varchar(32),
	`visitorCpf` varchar(14),
	`status` enum('bot','waiting','active','closed','abandoned') NOT NULL DEFAULT 'bot',
	`nup` varchar(64),
	`userAgent` text,
	`ipAddress` varchar(64),
	`referrerUrl` varchar(1024),
	`lastActivityAt` timestamp NOT NULL DEFAULT (now()),
	`assignedAt` timestamp,
	`closedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webchatSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `webchatSessions_sessionToken_unique` UNIQUE(`sessionToken`)
);
--> statement-breakpoint
ALTER TABLE `tickets` MODIFY COLUMN `conversationId` int;--> statement-breakpoint
ALTER TABLE `tickets` MODIFY COLUMN `status` enum('open','in_progress','pending','resolved','closed') NOT NULL DEFAULT 'open';--> statement-breakpoint
ALTER TABLE `tickets` MODIFY COLUMN `createdById` int;--> statement-breakpoint
CREATE INDEX `wcs_token_idx` ON `webchatSessions` (`sessionToken`);--> statement-breakpoint
CREATE INDEX `wcs_conv_idx` ON `webchatSessions` (`conversationId`);--> statement-breakpoint
CREATE INDEX `wcs_status_idx` ON `webchatSessions` (`status`);--> statement-breakpoint
CREATE INDEX `wcs_activity_idx` ON `webchatSessions` (`lastActivityAt`);