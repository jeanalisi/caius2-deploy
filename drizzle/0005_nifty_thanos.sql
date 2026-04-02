CREATE TABLE `serviceTypeDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceTypeId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`requirement` enum('required','complementary','optional') NOT NULL DEFAULT 'required',
	`acceptedFormats` varchar(255) DEFAULT 'pdf,jpg,png',
	`maxSizeMb` int DEFAULT 10,
	`example` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `serviceTypeDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `serviceTypeFields` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceTypeId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`label` varchar(255) NOT NULL,
	`fieldType` enum('text','textarea','number','email','phone','cpf','cnpj','date','datetime','select','multiselect','checkbox','radio','file','image','signature','geolocation') NOT NULL DEFAULT 'text',
	`requirement` enum('required','complementary','optional') NOT NULL DEFAULT 'optional',
	`placeholder` varchar(255),
	`helpText` text,
	`options` text,
	`mask` varchar(64),
	`validation` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `serviceTypeFields_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `std_serviceType_idx` ON `serviceTypeDocuments` (`serviceTypeId`);--> statement-breakpoint
CREATE INDEX `stf_serviceType_idx` ON `serviceTypeFields` (`serviceTypeId`);