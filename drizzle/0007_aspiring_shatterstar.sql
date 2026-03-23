CREATE TABLE `nupNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nup` varchar(32) NOT NULL,
	`entityType` enum('protocol','conversation','ombudsman','process') NOT NULL,
	`entityId` int NOT NULL,
	`contactId` int,
	`channel` enum('email','whatsapp','instagram','sms','system') NOT NULL,
	`recipientAddress` varchar(512),
	`status` enum('pending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`content` text,
	`trackingLink` text,
	`trackingToken` varchar(128),
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nupNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `nn_nup_idx` ON `nupNotifications` (`nup`);--> statement-breakpoint
CREATE INDEX `nn_entity_idx` ON `nupNotifications` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `nn_contact_idx` ON `nupNotifications` (`contactId`);