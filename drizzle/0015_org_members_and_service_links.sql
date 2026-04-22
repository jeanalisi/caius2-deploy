-- ─── orgMembers: membros públicos da estrutura administrativa ────────────────
CREATE TABLE `orgMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgUnitId` int NOT NULL,
	`positionId` int,
	`name` varchar(255) NOT NULL,
	`matricula` varchar(64),
	`cargo` varchar(255) NOT NULL,
	`cargoLei` varchar(128),
	`photoUrl` text,
	`email` varchar(320),
	`phone` varchar(64),
	`isPublic` boolean DEFAULT true NOT NULL,
	`isActive` boolean DEFAULT true NOT NULL,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orgMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
-- ─── Vincular serviceTypes à unidade organizacional ─────────────────────────
ALTER TABLE `serviceTypes` ADD `orgUnitId` int;
