CREATE TABLE `allocationHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fromOrgUnitId` int,
	`toOrgUnitId` int,
	`fromPositionId` int,
	`toPositionId` int,
	`changeType` enum('allocation','transfer','promotion','removal','invite_accepted') NOT NULL,
	`changedBy` int,
	`notes` text,
	`ipAddress` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `allocationHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orgInvites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(255),
	`orgUnitId` int NOT NULL,
	`positionId` int,
	`systemProfile` enum('citizen','attendant','sector_server','analyst','manager','authority','admin') NOT NULL DEFAULT 'attendant',
	`status` enum('pending','accepted','expired','cancelled') NOT NULL DEFAULT 'pending',
	`invitedBy` int NOT NULL,
	`acceptedBy` int,
	`notes` text,
	`expiresAt` timestamp,
	`acceptedAt` timestamp,
	`acceptedIp` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orgInvites_id` PRIMARY KEY(`id`),
	CONSTRAINT `orgInvites_token_unique` UNIQUE(`token`),
	CONSTRAINT `invite_token_idx` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `orgUnits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(512) NOT NULL,
	`acronym` varchar(32),
	`type` enum('prefeitura','gabinete','procuradoria','controladoria','secretaria','superintendencia','secretaria_executiva','diretoria','departamento','coordenacao','gerencia','supervisao','secao','setor','nucleo','assessoria','unidade','junta','tesouraria','ouvidoria') NOT NULL DEFAULT 'setor',
	`level` int NOT NULL DEFAULT 1,
	`parentId` int,
	`managerId` int,
	`description` text,
	`legalBasis` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`isSeeded` boolean NOT NULL DEFAULT false,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orgUnits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(64),
	`orgUnitId` int,
	`level` enum('secretario','secretario_executivo','diretor','coordenador','gerente','supervisor','chefe','assessor_tecnico','assessor_especial','outro') NOT NULL DEFAULT 'outro',
	`provisionType` enum('comissao','efetivo','designacao','contrato') DEFAULT 'comissao',
	`canSign` boolean NOT NULL DEFAULT false,
	`canApprove` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`isSeeded` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `positions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userAllocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orgUnitId` int NOT NULL,
	`positionId` int,
	`isPrimary` boolean NOT NULL DEFAULT true,
	`systemProfile` enum('citizen','attendant','sector_server','analyst','manager','authority','admin') NOT NULL DEFAULT 'attendant',
	`startDate` timestamp NOT NULL DEFAULT (now()),
	`endDate` timestamp,
	`notes` text,
	`allocatedBy` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userAllocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `allocHist_user_idx` ON `allocationHistory` (`userId`);--> statement-breakpoint
CREATE INDEX `invite_email_idx` ON `orgInvites` (`email`);--> statement-breakpoint
CREATE INDEX `invite_unit_idx` ON `orgInvites` (`orgUnitId`);--> statement-breakpoint
CREATE INDEX `orgUnit_parent_idx` ON `orgUnits` (`parentId`);--> statement-breakpoint
CREATE INDEX `orgUnit_level_idx` ON `orgUnits` (`level`);--> statement-breakpoint
CREATE INDEX `orgUnit_type_idx` ON `orgUnits` (`type`);--> statement-breakpoint
CREATE INDEX `alloc_user_idx` ON `userAllocations` (`userId`);--> statement-breakpoint
CREATE INDEX `alloc_unit_idx` ON `userAllocations` (`orgUnitId`);