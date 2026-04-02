CREATE TABLE `caiusAgents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`context` enum('external','internal','both') NOT NULL DEFAULT 'both',
	`systemPrompt` text NOT NULL,
	`description` text,
	`model` varchar(128) DEFAULT 'gemini-2.5-flash',
	`maxTokens` int DEFAULT 2048,
	`temperature` varchar(8) DEFAULT '0.4',
	`isActive` boolean NOT NULL DEFAULT true,
	`isDefault` boolean NOT NULL DEFAULT false,
	`allowVoice` boolean NOT NULL DEFAULT true,
	`allowKnowledgeBase` boolean NOT NULL DEFAULT true,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `caiusAgents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `caiusAuditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int,
	`messageId` int,
	`actionId` int,
	`userId` int,
	`userName` varchar(255),
	`userIp` varchar(64),
	`citizenId` int,
	`event` enum('session_started','session_closed','message_sent','message_received','voice_transcribed','voice_synthesized','knowledge_queried','knowledge_used','action_suggested','action_approved','action_rejected','action_applied','email_analyzed','protocol_linked','nup_linked','error_occurred') NOT NULL,
	`channel` enum('chat','whatsapp','email','voice','internal'),
	`nup` varchar(32),
	`protocolId` int,
	`emailMessageId` int,
	`inputSummary` text,
	`outputSummary` text,
	`sourcesUsed` json,
	`tokensUsed` int,
	`durationMs` int,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `caiusAuditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `caiusFeedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`messageId` int,
	`userId` int,
	`citizenId` int,
	`rating` enum('positive','negative','neutral') NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `caiusFeedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `caiusKnowledgeItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(512) NOT NULL,
	`sourceType` enum('document','text','link','faq','regulation','manual','flow','template') NOT NULL,
	`content` longtext,
	`summary` text,
	`fileUrl` varchar(1024),
	`fileName` varchar(512),
	`fileMimeType` varchar(128),
	`fileSizeBytes` int,
	`linkUrl` varchar(2048),
	`linkLastFetchedAt` timestamp,
	`linkAutoUpdate` boolean DEFAULT false,
	`category` varchar(128),
	`sectorId` int,
	`serviceId` int,
	`tags` json,
	`keywords` text,
	`status` enum('draft','active','archived','revoked') NOT NULL DEFAULT 'draft',
	`version` int NOT NULL DEFAULT 1,
	`validFrom` timestamp,
	`validUntil` timestamp,
	`authorId` int NOT NULL,
	`reviewedById` int,
	`reviewedAt` timestamp,
	`approvedById` int,
	`approvedAt` timestamp,
	`embedding` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `caiusKnowledgeItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `caiusKnowledgeUsageLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int,
	`messageId` int,
	`itemId` int NOT NULL,
	`relevanceScore` varchar(8),
	`usedInResponse` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `caiusKnowledgeUsageLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `caiusKnowledgeVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemId` int NOT NULL,
	`version` int NOT NULL,
	`content` longtext,
	`changedById` int NOT NULL,
	`changeNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `caiusKnowledgeVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `caiusMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`contentType` enum('text','audio','image','file') NOT NULL DEFAULT 'text',
	`content` text NOT NULL,
	`audioUrl` varchar(1024),
	`audioTranscription` text,
	`audioDurationSeconds` int,
	`audioConfidence` varchar(8),
	`fileUrl` varchar(1024),
	`fileName` varchar(512),
	`tokensUsed` int,
	`sourcesUsed` json,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `caiusMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `caiusSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`userId` int,
	`citizenId` int,
	`context` enum('external','internal') NOT NULL,
	`channel` enum('chat','whatsapp','email','voice','internal') NOT NULL DEFAULT 'chat',
	`nup` varchar(32),
	`protocolId` int,
	`emailMessageId` int,
	`conversationId` int,
	`title` varchar(512),
	`status` enum('active','closed','archived') NOT NULL DEFAULT 'active',
	`summary` text,
	`metadata` json,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `caiusSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `caiusSuggestedActions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`messageId` int,
	`actionType` enum('open_protocol','link_nup','assign_sector','suggest_response','classify_email','summarize','identify_service','set_priority','request_document','escalate','close_protocol','other') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`payload` json,
	`status` enum('pending','approved','rejected','edited','applied') NOT NULL DEFAULT 'pending',
	`reviewedById` int,
	`reviewedAt` timestamp,
	`reviewNote` text,
	`appliedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `caiusSuggestedActions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `caiusVoiceInteractions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`messageId` int,
	`direction` enum('input','output') NOT NULL,
	`audioUrl` varchar(1024),
	`audioStorageKey` varchar(1024),
	`durationSeconds` int,
	`transcription` text,
	`transcriptionConfidence` varchar(8),
	`language` varchar(8) DEFAULT 'pt-BR',
	`ttsVoice` varchar(64),
	`status` enum('pending','processing','done','error') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`requiresHumanReview` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `caiusVoiceInteractions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `ca_slug_idx` ON `caiusAgents` (`slug`);--> statement-breakpoint
CREATE INDEX `ca_context_idx` ON `caiusAgents` (`context`);--> statement-breakpoint
CREATE INDEX `cal_session_idx` ON `caiusAuditLogs` (`sessionId`);--> statement-breakpoint
CREATE INDEX `cal_user_idx` ON `caiusAuditLogs` (`userId`);--> statement-breakpoint
CREATE INDEX `cal_event_idx` ON `caiusAuditLogs` (`event`);--> statement-breakpoint
CREATE INDEX `cal_nup_idx` ON `caiusAuditLogs` (`nup`);--> statement-breakpoint
CREATE INDEX `cal_created_idx` ON `caiusAuditLogs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `cf_session_idx` ON `caiusFeedback` (`sessionId`);--> statement-breakpoint
CREATE INDEX `cf_rating_idx` ON `caiusFeedback` (`rating`);--> statement-breakpoint
CREATE INDEX `cki_status_idx` ON `caiusKnowledgeItems` (`status`);--> statement-breakpoint
CREATE INDEX `cki_source_idx` ON `caiusKnowledgeItems` (`sourceType`);--> statement-breakpoint
CREATE INDEX `cki_category_idx` ON `caiusKnowledgeItems` (`category`);--> statement-breakpoint
CREATE INDEX `cki_sector_idx` ON `caiusKnowledgeItems` (`sectorId`);--> statement-breakpoint
CREATE INDEX `ckul_session_idx` ON `caiusKnowledgeUsageLogs` (`sessionId`);--> statement-breakpoint
CREATE INDEX `ckul_item_idx` ON `caiusKnowledgeUsageLogs` (`itemId`);--> statement-breakpoint
CREATE INDEX `ckv_item_idx` ON `caiusKnowledgeVersions` (`itemId`);--> statement-breakpoint
CREATE INDEX `cm_session_idx` ON `caiusMessages` (`sessionId`);--> statement-breakpoint
CREATE INDEX `cm_role_idx` ON `caiusMessages` (`role`);--> statement-breakpoint
CREATE INDEX `cm_created_idx` ON `caiusMessages` (`createdAt`);--> statement-breakpoint
CREATE INDEX `cs_agent_idx` ON `caiusSessions` (`agentId`);--> statement-breakpoint
CREATE INDEX `cs_user_idx` ON `caiusSessions` (`userId`);--> statement-breakpoint
CREATE INDEX `cs_nup_idx` ON `caiusSessions` (`nup`);--> statement-breakpoint
CREATE INDEX `cs_status_idx` ON `caiusSessions` (`status`);--> statement-breakpoint
CREATE INDEX `cs_channel_idx` ON `caiusSessions` (`channel`);--> statement-breakpoint
CREATE INDEX `csa_session_idx` ON `caiusSuggestedActions` (`sessionId`);--> statement-breakpoint
CREATE INDEX `csa_status_idx` ON `caiusSuggestedActions` (`status`);--> statement-breakpoint
CREATE INDEX `csa_type_idx` ON `caiusSuggestedActions` (`actionType`);--> statement-breakpoint
CREATE INDEX `cvi_session_idx` ON `caiusVoiceInteractions` (`sessionId`);--> statement-breakpoint
CREATE INDEX `cvi_direction_idx` ON `caiusVoiceInteractions` (`direction`);