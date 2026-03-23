CREATE TABLE `processDeadlineHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`processId` int NOT NULL,
	`processNup` varchar(32),
	`previousDeadline` timestamp,
	`newDeadline` timestamp,
	`reason` text NOT NULL,
	`action` enum('set','extend','reduce','remove') NOT NULL DEFAULT 'set',
	`changedById` int NOT NULL,
	`changedByName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `processDeadlineHistory_id` PRIMARY KEY(`id`)
);
