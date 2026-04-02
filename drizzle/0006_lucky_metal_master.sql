CREATE TABLE `userMenuPermissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`menuKey` varchar(128) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userMenuPermissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `ump_user_menu_idx` ON `userMenuPermissions` (`userId`,`menuKey`);--> statement-breakpoint
CREATE INDEX `ump_user_idx` ON `userMenuPermissions` (`userId`);