CREATE TABLE `emailAttachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emailMessageId` int NOT NULL,
	`filename` varchar(512) NOT NULL,
	`mimeType` varchar(128) NOT NULL,
	`sizeBytes` int NOT NULL,
	`storageKey` varchar(1024),
	`storageUrl` text,
	`isInline` boolean NOT NULL DEFAULT false,
	`contentId` varchar(512),
	`md5` varchar(32),
	`sha256` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailAttachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailAuditTrail` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`userName` varchar(255),
	`userIp` varchar(64),
	`action` enum('mailbox_created','mailbox_updated','mailbox_deleted','mailbox_synced','message_received','message_read','message_replied','message_forwarded','message_archived','message_spam','message_deleted','message_restored','message_assigned','message_transferred','nup_linked','nup_unlinked','nup_created','rule_created','rule_updated','rule_deleted','rule_matched','attachment_downloaded','attachment_deleted','queue_sent','queue_failed','queue_retried') NOT NULL,
	`entityType` enum('mailbox','message','attachment','rule','queue') NOT NULL,
	`entityId` int,
	`mailboxId` int,
	`emailMessageId` int,
	`nup` varchar(32),
	`previousValue` json,
	`newValue` json,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailAuditTrail_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailMailboxes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` varchar(320) NOT NULL,
	`displayName` varchar(255),
	`description` text,
	`sectorId` int,
	`imapHost` varchar(255) NOT NULL,
	`imapPort` int NOT NULL DEFAULT 993,
	`imapUser` varchar(320) NOT NULL,
	`imapPassword` text NOT NULL,
	`imapSecure` boolean NOT NULL DEFAULT true,
	`imapMailbox` varchar(128) NOT NULL DEFAULT 'INBOX',
	`smtpHost` varchar(255) NOT NULL,
	`smtpPort` int NOT NULL DEFAULT 587,
	`smtpUser` varchar(320) NOT NULL,
	`smtpPassword` text NOT NULL,
	`smtpSecure` boolean NOT NULL DEFAULT false,
	`status` enum('active','inactive','error','syncing') NOT NULL DEFAULT 'inactive',
	`lastSyncAt` timestamp,
	`lastSyncError` text,
	`lastUid` bigint NOT NULL DEFAULT 0,
	`syncIntervalMinutes` int NOT NULL DEFAULT 5,
	`autoReplyEnabled` boolean NOT NULL DEFAULT true,
	`autoReplyTemplate` text,
	`signature` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailMailboxes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mailboxId` int NOT NULL,
	`messageId` varchar(512),
	`inReplyTo` varchar(512),
	`references` text,
	`imapUid` bigint,
	`fromAddress` varchar(320) NOT NULL,
	`fromName` varchar(255),
	`toAddresses` text NOT NULL,
	`ccAddresses` text,
	`bccAddresses` text,
	`replyTo` varchar(320),
	`subject` varchar(998) NOT NULL,
	`bodyText` text,
	`bodyHtml` text,
	`direction` enum('inbound','outbound') NOT NULL,
	`status` enum('received','triaged','in_progress','replied','archived','spam','bounced','failed','sent') NOT NULL DEFAULT 'received',
	`nup` varchar(32),
	`conversationId` int,
	`contactId` int,
	`sectorId` int,
	`assignedUserId` int,
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`tags` text,
	`isRead` boolean NOT NULL DEFAULT false,
	`isStarred` boolean NOT NULL DEFAULT false,
	`isSpam` boolean NOT NULL DEFAULT false,
	`threadId` varchar(512),
	`receivedAt` timestamp,
	`sentAt` timestamp,
	`sizeBytes` int,
	`hasAttachments` boolean NOT NULL DEFAULT false,
	`attachmentCount` int NOT NULL DEFAULT 0,
	`smtpMessageId` varchar(512),
	`sendAttempts` int NOT NULL DEFAULT 0,
	`lastSendError` text,
	`scheduledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailNupLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emailMessageId` int NOT NULL,
	`nup` varchar(32) NOT NULL,
	`entityType` enum('protocol','process','ombudsman','conversation','document') NOT NULL,
	`entityId` int NOT NULL,
	`linkMethod` enum('auto_message_id','auto_subject','auto_sender','manual') NOT NULL,
	`linkedById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailNupLinks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailRoutingRules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mailboxId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`priority` int NOT NULL DEFAULT 100,
	`conditions` json NOT NULL,
	`conditionLogic` enum('and','or') NOT NULL DEFAULT 'and',
	`actions` json NOT NULL,
	`matchCount` int NOT NULL DEFAULT 0,
	`lastMatchAt` timestamp,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailRoutingRules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailSendQueue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mailboxId` int NOT NULL,
	`emailMessageId` int,
	`toAddresses` text NOT NULL,
	`ccAddresses` text,
	`bccAddresses` text,
	`replyTo` varchar(320),
	`subject` varchar(998) NOT NULL,
	`bodyText` text,
	`bodyHtml` text,
	`inReplyTo` varchar(512),
	`references` text,
	`nup` varchar(32),
	`status` enum('pending','processing','sent','failed','cancelled') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`maxAttempts` int NOT NULL DEFAULT 3,
	`lastAttemptAt` timestamp,
	`nextAttemptAt` timestamp,
	`sentAt` timestamp,
	`errorMessage` text,
	`scheduledAt` timestamp,
	`priority` int NOT NULL DEFAULT 5,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailSendQueue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailSyncLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mailboxId` int NOT NULL,
	`operation` enum('imap_sync','smtp_send','rule_apply','nup_link','auto_reply') NOT NULL,
	`status` enum('success','partial','error') NOT NULL,
	`messagesProcessed` int DEFAULT 0,
	`messagesNew` int DEFAULT 0,
	`messagesFailed` int DEFAULT 0,
	`durationMs` int,
	`errorMessage` text,
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailSyncLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `conversations` MODIFY COLUMN `channel` enum('whatsapp','instagram','email','web') NOT NULL;--> statement-breakpoint
CREATE INDEX `ema_msg_idx` ON `emailAttachments` (`emailMessageId`);--> statement-breakpoint
CREATE INDEX `eat_user_idx` ON `emailAuditTrail` (`userId`);--> statement-breakpoint
CREATE INDEX `eat_action_idx` ON `emailAuditTrail` (`action`);--> statement-breakpoint
CREATE INDEX `eat_mailbox_idx` ON `emailAuditTrail` (`mailboxId`);--> statement-breakpoint
CREATE INDEX `eat_nup_idx` ON `emailAuditTrail` (`nup`);--> statement-breakpoint
CREATE INDEX `eat_created_idx` ON `emailAuditTrail` (`createdAt`);--> statement-breakpoint
CREATE INDEX `emb_sector_idx` ON `emailMailboxes` (`sectorId`);--> statement-breakpoint
CREATE INDEX `emb_status_idx` ON `emailMailboxes` (`status`);--> statement-breakpoint
CREATE INDEX `emi_mailbox_idx` ON `emailMessages` (`mailboxId`);--> statement-breakpoint
CREATE INDEX `emi_nup_idx` ON `emailMessages` (`nup`);--> statement-breakpoint
CREATE INDEX `emi_thread_idx` ON `emailMessages` (`threadId`);--> statement-breakpoint
CREATE INDEX `emi_status_idx` ON `emailMessages` (`status`);--> statement-breakpoint
CREATE INDEX `emi_sector_idx` ON `emailMessages` (`sectorId`);--> statement-breakpoint
CREATE INDEX `emi_received_idx` ON `emailMessages` (`receivedAt`);--> statement-breakpoint
CREATE INDEX `enl_msg_idx` ON `emailNupLinks` (`emailMessageId`);--> statement-breakpoint
CREATE INDEX `enl_nup_idx` ON `emailNupLinks` (`nup`);--> statement-breakpoint
CREATE INDEX `err_priority_idx` ON `emailRoutingRules` (`priority`);--> statement-breakpoint
CREATE INDEX `err_active_idx` ON `emailRoutingRules` (`isActive`);--> statement-breakpoint
CREATE INDEX `esq_status_idx` ON `emailSendQueue` (`status`);--> statement-breakpoint
CREATE INDEX `esq_mailbox_idx` ON `emailSendQueue` (`mailboxId`);--> statement-breakpoint
CREATE INDEX `esl_mailbox_idx` ON `emailSyncLogs` (`mailboxId`);--> statement-breakpoint
CREATE INDEX `esl_created_idx` ON `emailSyncLogs` (`createdAt`);