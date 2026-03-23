ALTER TABLE `messages` ADD `deliveryStatus` enum('pending','sent','delivered','failed') DEFAULT 'sent' NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `deliveryError` text;