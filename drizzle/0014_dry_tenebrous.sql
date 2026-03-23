ALTER TABLE `serviceTypes` ADD `serviceMode` enum('form','external') DEFAULT 'form' NOT NULL;--> statement-breakpoint
ALTER TABLE `serviceTypes` ADD `externalUrl` varchar(2048);