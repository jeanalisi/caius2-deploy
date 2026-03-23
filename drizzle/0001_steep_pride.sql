CREATE TABLE `accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`channel` enum('whatsapp','instagram','email') NOT NULL,
	`name` varchar(255) NOT NULL,
	`identifier` varchar(320) NOT NULL,
	`status` enum('connecting','connected','disconnected','error') NOT NULL DEFAULT 'disconnected',
	`waSessionData` text,
	`waQrCode` text,
	`igAccessToken` text,
	`igUserId` varchar(64),
	`imapHost` varchar(255),
	`imapPort` int,
	`imapUser` varchar(320),
	`imapPassword` text,
	`smtpHost` varchar(255),
	`smtpPort` int,
	`smtpUser` varchar(320),
	`smtpPassword` text,
	`smtpSecure` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255),
	`email` varchar(320),
	`phone` varchar(64),
	`igHandle` varchar(128),
	`avatarUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversationTags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`tagId` int NOT NULL,
	CONSTRAINT `conversationTags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`contactId` int,
	`channel` enum('whatsapp','instagram','email') NOT NULL,
	`externalId` varchar(512),
	`subject` varchar(512),
	`status` enum('open','pending','resolved','snoozed') NOT NULL DEFAULT 'open',
	`assignedAgentId` int,
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`unreadCount` int NOT NULL DEFAULT 0,
	`lastMessageAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`externalId` varchar(512),
	`direction` enum('inbound','outbound') NOT NULL,
	`type` enum('text','image','audio','video','document','sticker','location','template') NOT NULL DEFAULT 'text',
	`content` text,
	`mediaUrl` text,
	`metadata` json,
	`senderName` varchar(255),
	`senderAgentId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('new_message','ticket_assigned','ticket_resolved','queue_assigned','mention') NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text,
	`isRead` boolean NOT NULL DEFAULT false,
	`relatedConversationId` int,
	`relatedTicketId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`position` int NOT NULL,
	`assignedAgentId` int,
	`status` enum('waiting','assigned','completed') NOT NULL DEFAULT 'waiting',
	`waitingSince` timestamp NOT NULL DEFAULT (now()),
	`assignedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`color` varchar(16) NOT NULL DEFAULT '#6366f1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`description` text,
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`assignedAgentId` int,
	`createdById` int NOT NULL,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `isAgent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `isAvailable` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;