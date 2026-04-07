CREATE TABLE `bulkCampaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`accountId` int NOT NULL,
	`message` text NOT NULL,
	`status` enum('draft','running','paused','completed','cancelled') NOT NULL DEFAULT 'draft',
	`totalCount` int NOT NULL DEFAULT 0,
	`sentCount` int NOT NULL DEFAULT 0,
	`failedCount` int NOT NULL DEFAULT 0,
	`delaySeconds` int NOT NULL DEFAULT 3,
	`scheduledAt` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bulkCampaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bulkRecipients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`phone` varchar(64) NOT NULL,
	`name` varchar(255),
	`customMessage` text,
	`status` enum('pending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bulkRecipients_id` PRIMARY KEY(`id`)
);
