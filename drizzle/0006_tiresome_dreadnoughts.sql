CREATE TABLE `serviceSubjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceTypeId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`code` varchar(64),
	`isPublic` boolean NOT NULL DEFAULT true,
	`isActive` boolean NOT NULL DEFAULT true,
	`formTemplateId` int,
	`slaResponseHours` int,
	`slaConclusionHours` int,
	`responsibleSectorId` int,
	`importantNotes` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `serviceSubjects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `serviceTypes` ADD `isPublic` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `serviceTypes` ADD `publicationStatus` enum('draft','published','inactive','restricted') DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `serviceTypes` ADD `purpose` text;--> statement-breakpoint
ALTER TABLE `serviceTypes` ADD `whoCanRequest` text;--> statement-breakpoint
ALTER TABLE `serviceTypes` ADD `cost` varchar(255);--> statement-breakpoint
ALTER TABLE `serviceTypes` ADD `formOfService` varchar(255);--> statement-breakpoint
ALTER TABLE `serviceTypes` ADD `responseChannel` varchar(255);--> statement-breakpoint
ALTER TABLE `serviceTypes` ADD `importantNotes` text;--> statement-breakpoint
ALTER TABLE `serviceTypes` ADD `faq` json;--> statement-breakpoint
ALTER TABLE `serviceTypes` ADD `formTemplateId` int;--> statement-breakpoint
CREATE INDEX `ss_serviceType_idx` ON `serviceSubjects` (`serviceTypeId`);