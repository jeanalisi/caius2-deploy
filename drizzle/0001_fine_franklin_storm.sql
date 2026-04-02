CREATE TABLE `accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`channel` enum('whatsapp','instagram','email') NOT NULL,
	`name` varchar(255) NOT NULL,
	`identifier` varchar(320) NOT NULL,
	`status` enum('connecting','connected','disconnected','error') NOT NULL DEFAULT 'disconnected',
	`waSessionData` text,
	`waQrCode` text,
	`igAccessToken` text,
	`igUserId` varchar(64),
	`imapHost` varchar(255),
	`imapPort` int,
	`imapUser` varchar(320),
	`imapPassword` text,
	`smtpHost` varchar(255),
	`smtpPort` int,
	`smtpUser` varchar(320),
	`smtpPassword` text,
	`smtpSecure` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `adminProcesses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nup` varchar(32) NOT NULL,
	`originProtocolNup` varchar(32),
	`title` varchar(512) NOT NULL,
	`type` varchar(128) NOT NULL,
	`description` text,
	`legalBasis` text,
	`observations` text,
	`decision` text,
	`status` enum('open','in_analysis','pending_docs','in_progress','concluded','archived') NOT NULL DEFAULT 'open',
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`isConfidential` boolean NOT NULL DEFAULT false,
	`responsibleSectorId` int,
	`responsibleUserId` int,
	`createdById` int NOT NULL,
	`deadline` timestamp,
	`concludedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `adminProcesses_id` PRIMARY KEY(`id`),
	CONSTRAINT `adminProcesses_nup_unique` UNIQUE(`nup`)
);
--> statement-breakpoint
CREATE TABLE `agentStatus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('online','away','busy','offline') DEFAULT 'offline',
	`statusMessage` varchar(300),
	`maxConcurrentChats` int DEFAULT 5,
	`currentChats` int DEFAULT 0,
	`lastSeenAt` timestamp,
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agentStatus_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aiProviders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('openai','gemini','anthropic','other') NOT NULL,
	`name` varchar(128) NOT NULL,
	`encryptedApiKey` text NOT NULL,
	`model` varchar(128),
	`isActive` boolean NOT NULL DEFAULT true,
	`allowedProfiles` json,
	`allowedSectors` json,
	`allowedDocTypes` json,
	`retainHistory` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aiProviders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aiUsageLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`userId` int NOT NULL,
	`nup` varchar(32),
	`entityType` varchar(64),
	`entityId` int,
	`prompt` text,
	`response` text,
	`action` varchar(128),
	`tokensUsed` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiUsageLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `attachmentConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceTypeId` int,
	`formTemplateId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`acceptedTypes` json,
	`maxFileSizeMb` int NOT NULL DEFAULT 10,
	`maxTotalSizeMb` int NOT NULL DEFAULT 50,
	`minCount` int NOT NULL DEFAULT 0,
	`maxCount` int NOT NULL DEFAULT 10,
	`isRequired` boolean NOT NULL DEFAULT false,
	`allowedAtStages` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attachmentConfigs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nup` varchar(32),
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`configId` int,
	`uploadedById` int NOT NULL,
	`fileName` varchar(512) NOT NULL,
	`originalName` varchar(512) NOT NULL,
	`mimeType` varchar(128) NOT NULL,
	`fileSizeBytes` bigint NOT NULL,
	`s3Key` varchar(1024) NOT NULL,
	`s3Url` text NOT NULL,
	`category` varchar(128),
	`version` int NOT NULL DEFAULT 1,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`deletedAt` timestamp,
	`deletedById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attendanceMetricsSnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int,
	`orgUnitId` int,
	`snapshotDate` timestamp NOT NULL,
	`totalConversations` int DEFAULT 0,
	`resolvedConversations` int DEFAULT 0,
	`avgResponseTimeMs` int DEFAULT 0,
	`avgHandleTimeMs` int DEFAULT 0,
	`firstResponseTimeMs` int DEFAULT 0,
	`satisfactionScore` int,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `attendanceMetricsSnapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audioTranscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` int,
	`conversationId` int,
	`contactId` int,
	`protocolId` int,
	`nup` varchar(64),
	`audioUrl` varchar(1024),
	`provider` varchar(64) DEFAULT 'whisper',
	`transcriptionText` text,
	`language` varchar(16),
	`confidence` varchar(16),
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`durationSeconds` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `audioTranscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nup` varchar(32),
	`userId` int,
	`userName` varchar(255),
	`action` varchar(128) NOT NULL,
	`entity` varchar(64) NOT NULL,
	`entityId` int,
	`details` json,
	`ipAddress` varchar(64),
	`aiAssisted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `botFlows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`accountId` int,
	`isActive` boolean NOT NULL DEFAULT false,
	`rootNodeId` int,
	`sessionTimeoutMinutes` int NOT NULL DEFAULT 30,
	`timeoutMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `botFlows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `botNodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`flowId` int NOT NULL,
	`nodeType` enum('menu','message','collect','transfer','protocol','end') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`collectField` varchar(64),
	`transferSectorId` int,
	`protocolType` enum('request','complaint','information','suggestion','praise','ombudsman','esic'),
	`protocolSubject` varchar(512),
	`protocolServiceTypeId` int,
	`nextNodeId` int,
	`options` json,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `botNodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `botSessionLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`nodeId` int,
	`botMessage` text,
	`userInput` varchar(1024),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `botSessionLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `botSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jid` varchar(128) NOT NULL,
	`accountId` int NOT NULL,
	`flowId` int NOT NULL,
	`currentNodeId` int NOT NULL,
	`collectedData` json,
	`status` enum('active','completed','expired','transferred') NOT NULL DEFAULT 'active',
	`generatedNup` varchar(32),
	`conversationId` int,
	`lastInteractionAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `botSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `channelHealthLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`channel` enum('whatsapp','instagram','email') NOT NULL,
	`status` enum('healthy','degraded','unhealthy','unknown') NOT NULL DEFAULT 'unknown',
	`latencyMs` int,
	`errorMessage` text,
	`checkedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `channelHealthLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `channelSyncState` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`channel` enum('whatsapp','instagram','email') NOT NULL,
	`lastCursor` varchar(512),
	`lastMessageAt` timestamp,
	`lastSyncAt` timestamp,
	`status` enum('idle','syncing','error','disconnected') NOT NULL DEFAULT 'idle',
	`errorMessage` text,
	`syncCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `channelSyncState_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `complianceEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`entityType` varchar(100),
	`entityId` int,
	`nup` varchar(50),
	`description` text,
	`severity` enum('info','warning','critical') DEFAULT 'info',
	`resolvedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `complianceEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255),
	`email` varchar(320),
	`phone` varchar(64),
	`cpfCnpj` varchar(18),
	`igHandle` varchar(128),
	`avatarUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contextHelp` (
	`id` int AUTO_INCREMENT NOT NULL,
	`featureKey` varchar(128) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`detailedInstructions` text,
	`examples` text,
	`requiredDocuments` text,
	`warnings` text,
	`usefulLinks` json,
	`normativeBase` text,
	`targetProfiles` json,
	`displayMode` enum('tooltip','modal','sidebar','expandable') NOT NULL DEFAULT 'modal',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contextHelp_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversationTags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`tagId` int NOT NULL,
	CONSTRAINT `conversationTags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversationTransfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`fromAgentId` int,
	`toAgentId` int,
	`toOrgUnitId` int,
	`reason` text,
	`status` enum('pending','accepted','rejected') DEFAULT 'pending',
	`transferredAt` timestamp DEFAULT (now()),
	`acceptedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `conversationTransfers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nup` varchar(32),
	`accountId` int NOT NULL,
	`contactId` int,
	`channel` enum('whatsapp','instagram','email') NOT NULL,
	`externalId` varchar(512),
	`subject` varchar(512),
	`status` enum('open','pending','resolved','snoozed') NOT NULL DEFAULT 'open',
	`assignedAgentId` int,
	`assignedSectorId` int,
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`unreadCount` int NOT NULL DEFAULT 0,
	`lastMessageAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`),
	CONSTRAINT `conversations_nup_unique` UNIQUE(`nup`)
);
--> statement-breakpoint
CREATE TABLE `customModuleRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`moduleId` int NOT NULL,
	`nup` varchar(32),
	`title` varchar(256) NOT NULL,
	`status` varchar(64) NOT NULL DEFAULT 'open',
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`assignedTo` int,
	`sectorId` int,
	`data` json,
	`content` text,
	`isConfidential` boolean NOT NULL DEFAULT false,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customModuleRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customModules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`description` text,
	`icon` varchar(64) DEFAULT 'FileText',
	`color` varchar(32) DEFAULT '#6366f1',
	`menuSection` varchar(64) DEFAULT 'gestao-publica',
	`menuOrder` int DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`fields` json,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customModules_id` PRIMARY KEY(`id`),
	CONSTRAINT `customModules_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `deliveryAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int,
	`protocolId` int,
	`nup` varchar(64),
	`channel` enum('whatsapp','instagram','email') NOT NULL,
	`accountId` int NOT NULL,
	`recipient` varchar(512) NOT NULL,
	`eventType` varchar(128) NOT NULL,
	`payload` text,
	`status` enum('pending','sent','failed','retrying','cancelled') NOT NULL DEFAULT 'pending',
	`attemptNumber` int NOT NULL DEFAULT 1,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`sentAt` timestamp,
	`nextRetryAt` timestamp,
	CONSTRAINT `deliveryAttempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documentNumberSequences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentType` varchar(100) NOT NULL,
	`orgUnitId` int,
	`year` int NOT NULL,
	`lastNumber` int DEFAULT 0,
	`prefix` varchar(50),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documentNumberSequences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documentReadLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`documentType` varchar(100) NOT NULL,
	`readById` int,
	`readByIp` varchar(50),
	`isPublicAccess` boolean DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `documentReadLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documentSignatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`verifiableDocumentId` int NOT NULL,
	`nup` varchar(32),
	`signerId` int NOT NULL,
	`signerName` varchar(255) NOT NULL,
	`signerCpfMasked` varchar(20),
	`signerRole` varchar(128),
	`signerUnit` varchar(256),
	`signatureType` enum('institutional','advanced','qualified') NOT NULL DEFAULT 'institutional',
	`signatureMethod` varchar(128) DEFAULT 'CAIUS-INSTITUTIONAL',
	`documentHash` varchar(256),
	`signatureHash` varchar(256),
	`certificate` text,
	`certIssuer` varchar(512),
	`algorithm` varchar(64) DEFAULT 'SHA-256',
	`ipAddress` varchar(64),
	`userAgent` text,
	`accessCode` varchar(128) NOT NULL,
	`verificationUrl` varchar(1024),
	`status` enum('valid','invalid','altered','revoked','expired','replaced') NOT NULL DEFAULT 'valid',
	`signedAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	`revocationReason` text,
	`signatureOrder` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documentSignatures_id` PRIMARY KEY(`id`),
	CONSTRAINT `documentSignatures_accessCode_unique` UNIQUE(`accessCode`)
);
--> statement-breakpoint
CREATE TABLE `documentTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('memo','official_letter','dispatch','opinion','notification','certificate','report','response','other') NOT NULL,
	`content` text NOT NULL,
	`variables` json,
	`sectorId` int,
	`createdById` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documentTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documentVerificationLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`verifiableDocumentId` int,
	`verificationKey` varchar(128),
	`accessCode` varchar(128),
	`queryType` enum('nup','key','qrcode','link') NOT NULL DEFAULT 'key',
	`ipAddress` varchar(64),
	`userAgent` text,
	`result` enum('found','not_found','invalid') NOT NULL DEFAULT 'found',
	`accessedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documentVerificationLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documentVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`documentType` varchar(100) NOT NULL,
	`version` int NOT NULL,
	`content` text,
	`htmlContent` text,
	`pdfUrl` text,
	`changeDescription` varchar(500),
	`createdById` int,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `documentVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `electronicSignatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`nup` varchar(32),
	`signerId` int NOT NULL,
	`signerName` varchar(255) NOT NULL,
	`signerEmail` varchar(320),
	`signerRole` varchar(128),
	`ipAddress` varchar(64),
	`documentHash` varchar(256),
	`signedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `electronicSignatures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `formFieldOptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fieldId` int NOT NULL,
	`label` varchar(300) NOT NULL,
	`value` varchar(300) NOT NULL,
	`sortOrder` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	CONSTRAINT `formFieldOptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `formFields` (
	`id` int AUTO_INCREMENT NOT NULL,
	`formTemplateId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`label` varchar(255) NOT NULL,
	`fieldType` enum('text','textarea','number','currency','cpf','cnpj','rg','matricula','email','phone','date','time','datetime','address','cep','neighborhood','city','state','select','multiselect','checkbox','radio','dependent_list','file_upload','image','selfie','geolocation','map','calculated','hidden','signature','acknowledgment') NOT NULL,
	`placeholder` varchar(255),
	`helpText` text,
	`isRequired` boolean NOT NULL DEFAULT false,
	`defaultValue` text,
	`mask` varchar(128),
	`maxLength` int,
	`validationRegex` varchar(512),
	`options` json,
	`conditionalRule` json,
	`visibleToProfiles` json,
	`editableByProfiles` json,
	`isReadOnly` boolean NOT NULL DEFAULT false,
	`sectionName` varchar(128),
	`displayOrder` int NOT NULL DEFAULT 0,
	`dependsOnFieldId` int,
	`autoFill` varchar(128),
	`isReusable` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `formFields_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `formSubmissionValues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`fieldId` int NOT NULL,
	`fieldKey` varchar(200) NOT NULL,
	`value` text,
	`fileUrl` text,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `formSubmissionValues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `formSubmissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`formTemplateId` int NOT NULL,
	`protocolId` int,
	`contactId` int,
	`submittedById` int,
	`nup` varchar(50),
	`status` enum('draft','submitted','processing','completed','rejected') DEFAULT 'submitted',
	`submittedAt` timestamp DEFAULT (now()),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `formSubmissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `formTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceTypeId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`version` int NOT NULL DEFAULT 1,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `formTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `geoAttachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`geoEventId` int NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500),
	`mimeType` varchar(100),
	`description` varchar(500),
	`uploadedById` int,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `geoAttachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `geoEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`geoPointId` int NOT NULL,
	`title` varchar(300) NOT NULL,
	`description` text,
	`eventType` varchar(100),
	`severity` enum('low','medium','high','critical') DEFAULT 'medium',
	`status` enum('open','in_progress','resolved','closed') DEFAULT 'open',
	`orgUnitId` int,
	`nup` varchar(50),
	`reportedById` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `geoEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `geoPoints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(100),
	`entityId` int,
	`nup` varchar(50),
	`latitude` varchar(30) NOT NULL,
	`longitude` varchar(30) NOT NULL,
	`address` text,
	`neighborhood` varchar(200),
	`zone` varchar(200),
	`city` varchar(200),
	`state` varchar(50),
	`accuracy` varchar(50),
	`createdById` int,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `geoPoints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `institutionalConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` text,
	`type` enum('text','color','url','boolean','json') NOT NULL DEFAULT 'text',
	`label` varchar(255),
	`description` text,
	`updatedById` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `institutionalConfig_id` PRIMARY KEY(`id`),
	CONSTRAINT `institutionalConfig_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `knowledgeArticles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int,
	`title` varchar(500) NOT NULL,
	`slug` varchar(500) NOT NULL,
	`summary` text,
	`content` text NOT NULL,
	`tags` json,
	`isPublic` boolean DEFAULT false,
	`isActive` boolean DEFAULT true,
	`viewCount` int DEFAULT 0,
	`helpfulCount` int DEFAULT 0,
	`notHelpfulCount` int DEFAULT 0,
	`createdById` int,
	`updatedById` int,
	`publishedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledgeArticles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledgeCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`slug` varchar(200) NOT NULL,
	`description` text,
	`parentId` int,
	`icon` varchar(100),
	`sortOrder` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `knowledgeCategories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledgeTags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `knowledgeTags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `manifestationDeadlines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`manifestationId` int NOT NULL,
	`dueAt` timestamp NOT NULL,
	`extensionDays` int DEFAULT 0,
	`extensionReason` text,
	`isOverdue` boolean DEFAULT false,
	`alertSentAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manifestationDeadlines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `manifestationResponses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`manifestationId` int NOT NULL,
	`responseType` enum('internal','citizen','forward','archive') DEFAULT 'internal',
	`content` text NOT NULL,
	`attachmentUrl` text,
	`respondedById` int,
	`forwardedToOrgUnitId` int,
	`isPublic` boolean DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `manifestationResponses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `manifestationStatusHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`manifestationId` int NOT NULL,
	`fromStatus` varchar(100),
	`toStatus` varchar(100) NOT NULL,
	`notes` text,
	`changedById` int,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `manifestationStatusHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `manifestationTypes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`code` varchar(50) NOT NULL,
	`description` text,
	`deadlineDays` int DEFAULT 30,
	`allowAnonymous` boolean DEFAULT true,
	`requiresSecrecy` boolean DEFAULT false,
	`isEsic` boolean DEFAULT false,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `manifestationTypes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messageEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` int,
	`conversationId` int,
	`eventType` varchar(128) NOT NULL,
	`channel` enum('whatsapp','instagram','email') NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messageEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`externalId` varchar(512),
	`direction` enum('inbound','outbound') NOT NULL,
	`type` enum('text','image','audio','video','document','sticker','location','template') NOT NULL DEFAULT 'text',
	`content` text,
	`mediaUrl` text,
	`metadata` json,
	`senderName` varchar(255),
	`senderAgentId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`aiGenerated` boolean NOT NULL DEFAULT false,
	`deliveryStatus` enum('pending','sent','delivered','failed') NOT NULL DEFAULT 'sent',
	`deliveryError` text,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('new_message','ticket_assigned','ticket_resolved','queue_assigned','mention','protocol_update','tramitation','signature_request') NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text,
	`isRead` boolean NOT NULL DEFAULT false,
	`relatedConversationId` int,
	`relatedTicketId` int,
	`relatedProtocolId` int,
	`nup` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nupCounter` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`sequence` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nupCounter_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `officialDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nup` varchar(32),
	`protocolId` int,
	`processId` int,
	`type` enum('memo','official_letter','dispatch','opinion','notification','certificate','report','other') NOT NULL,
	`number` varchar(64) NOT NULL,
	`title` varchar(512) NOT NULL,
	`content` text,
	`authorId` int NOT NULL,
	`sectorId` int,
	`status` enum('draft','pending_signature','signed','published','archived') NOT NULL DEFAULT 'draft',
	`isConfidential` boolean NOT NULL DEFAULT false,
	`aiGenerated` boolean NOT NULL DEFAULT false,
	`fileUrl` text,
	`issuedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `officialDocuments_id` PRIMARY KEY(`id`),
	CONSTRAINT `officialDocuments_nup_unique` UNIQUE(`nup`),
	CONSTRAINT `officialDocuments_number_unique` UNIQUE(`number`)
);
--> statement-breakpoint
CREATE TABLE `ombudsmanManifestations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nup` varchar(32) NOT NULL,
	`type` enum('complaint','denounce','praise','suggestion','request','esic') NOT NULL,
	`subject` varchar(512) NOT NULL,
	`description` text NOT NULL,
	`isAnonymous` boolean NOT NULL DEFAULT false,
	`requesterName` varchar(255),
	`requesterEmail` varchar(320),
	`requesterPhone` varchar(64),
	`requesterCpfCnpj` varchar(18),
	`isConfidential` boolean NOT NULL DEFAULT false,
	`status` enum('received','in_analysis','in_progress','answered','archived') NOT NULL DEFAULT 'received',
	`responsibleSectorId` int,
	`responsibleUserId` int,
	`response` text,
	`respondedAt` timestamp,
	`deadline` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ombudsmanManifestations_id` PRIMARY KEY(`id`),
	CONSTRAINT `ombudsmanManifestations_nup_unique` UNIQUE(`nup`)
);
--> statement-breakpoint
CREATE TABLE `onlineSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionToken` varchar(256) NOT NULL,
	`ipAddress` varchar(64),
	`userAgent` text,
	`channel` varchar(64) NOT NULL DEFAULT 'web',
	`currentPage` varchar(512),
	`lastActivity` timestamp NOT NULL DEFAULT (now()),
	`isActive` boolean NOT NULL DEFAULT true,
	`terminatedById` int,
	`terminatedAt` timestamp,
	`loginAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `onlineSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `onlineSessions_sessionToken_unique` UNIQUE(`sessionToken`)
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
--> statement-breakpoint
CREATE TABLE `protocols` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nup` varchar(32) NOT NULL,
	`conversationId` int,
	`contactId` int,
	`requesterName` varchar(255),
	`requesterEmail` varchar(320),
	`requesterPhone` varchar(64),
	`requesterCpfCnpj` varchar(18),
	`subject` varchar(512) NOT NULL,
	`description` text,
	`type` enum('request','complaint','information','suggestion','praise','ombudsman','esic','administrative') NOT NULL DEFAULT 'request',
	`channel` enum('whatsapp','instagram','email','web','phone','in_person') NOT NULL DEFAULT 'web',
	`status` enum('open','in_analysis','pending_docs','in_progress','concluded','archived') NOT NULL DEFAULT 'open',
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`isConfidential` boolean NOT NULL DEFAULT false,
	`responsibleSectorId` int,
	`responsibleUserId` int,
	`createdById` int,
	`deadline` timestamp,
	`concludedAt` timestamp,
	`parentNup` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `protocols_id` PRIMARY KEY(`id`),
	CONSTRAINT `protocols_nup_unique` UNIQUE(`nup`)
);
--> statement-breakpoint
CREATE TABLE `queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`position` int NOT NULL,
	`assignedAgentId` int,
	`status` enum('waiting','assigned','completed') NOT NULL DEFAULT 'waiting',
	`waitingSince` timestamp NOT NULL DEFAULT (now()),
	`assignedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quickReplies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(300) NOT NULL,
	`content` text NOT NULL,
	`shortcut` varchar(50),
	`channel` varchar(50),
	`orgUnitId` int,
	`createdById` int,
	`isGlobal` boolean DEFAULT false,
	`usageCount` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quickReplies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `satisfactionSurveys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(300) NOT NULL,
	`description` text,
	`questions` json,
	`triggerEvent` varchar(100),
	`isActive` boolean DEFAULT true,
	`createdById` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `satisfactionSurveys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `searchIndex` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`nup` varchar(32),
	`title` varchar(512) NOT NULL,
	`content` text,
	`tags` json,
	`visibleToProfiles` json,
	`isPublic` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `searchIndex_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sectors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(32) NOT NULL,
	`description` text,
	`parentId` int,
	`managerId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sectors_id` PRIMARY KEY(`id`),
	CONSTRAINT `sectors_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `sensitiveAccessLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`entityId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`ipAddress` varchar(50),
	`userAgent` text,
	`justification` text,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `sensitiveAccessLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `serviceCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`slug` varchar(200) NOT NULL,
	`description` text,
	`icon` varchar(100),
	`color` varchar(50),
	`isActive` boolean DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `serviceCategories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `serviceChecklists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceTypeId` int NOT NULL,
	`item` varchar(500) NOT NULL,
	`description` text,
	`isRequired` boolean DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `serviceChecklists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `serviceFaqs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceTypeId` int NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`sortOrder` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `serviceFaqs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `servicePublications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceTypeId` int NOT NULL,
	`categoryId` int,
	`orgUnitId` int,
	`title` varchar(300) NOT NULL,
	`description` text,
	`citizenDescription` text,
	`requirements` text,
	`estimatedTime` varchar(100),
	`cost` varchar(100),
	`isPublic` boolean DEFAULT true,
	`isActive` boolean DEFAULT true,
	`publishedAt` timestamp,
	`unpublishedAt` timestamp,
	`publishedById` int,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `servicePublications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `serviceTypes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(128),
	`code` varchar(64),
	`initialSectorId` int,
	`slaResponseHours` int,
	`slaConclusionHours` int,
	`secrecyLevel` enum('public','restricted','confidential','secret') NOT NULL DEFAULT 'public',
	`requiresApproval` boolean NOT NULL DEFAULT false,
	`canConvertToProcess` boolean NOT NULL DEFAULT false,
	`allowPublicConsult` boolean NOT NULL DEFAULT true,
	`requiresSelfie` boolean NOT NULL DEFAULT false,
	`requiresGeolocation` boolean NOT NULL DEFAULT false,
	`requiresStrongAuth` boolean NOT NULL DEFAULT false,
	`defaultResponseTemplateId` int,
	`allowedProfiles` json,
	`flowConfig` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`isPublic` boolean NOT NULL DEFAULT false,
	`publicationStatus` enum('draft','published','inactive','restricted') NOT NULL DEFAULT 'draft',
	`purpose` text,
	`whoCanRequest` text,
	`cost` varchar(255),
	`formOfService` varchar(255),
	`responseChannel` varchar(255),
	`importantNotes` text,
	`faq` json,
	`formTemplateId` int,
	`serviceMode` enum('form','external') NOT NULL DEFAULT 'form',
	`externalUrl` varchar(2048),
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `serviceTypes_id` PRIMARY KEY(`id`),
	CONSTRAINT `serviceTypes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `surveyAnswers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`surveyId` int NOT NULL,
	`dispatchId` int,
	`conversationId` int,
	`contactId` int,
	`answers` json,
	`score` int,
	`comment` text,
	`submittedAt` timestamp DEFAULT (now()),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `surveyAnswers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `surveyDispatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`protocolId` int,
	`nup` varchar(64),
	`channel` enum('whatsapp','instagram','email') NOT NULL,
	`accountId` int NOT NULL,
	`recipient` varchar(512) NOT NULL,
	`status` enum('pending','sent','responded','failed','expired') NOT NULL DEFAULT 'pending',
	`surveyToken` varchar(128),
	`rating` int,
	`feedback` text,
	`sentAt` timestamp,
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `surveyDispatches_id` PRIMARY KEY(`id`),
	CONSTRAINT `surveyDispatches_surveyToken_unique` UNIQUE(`surveyToken`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`color` varchar(16) NOT NULL DEFAULT '#6366f1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`nup` varchar(32),
	`title` varchar(512) NOT NULL,
	`description` text,
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`assignedAgentId` int,
	`createdById` int NOT NULL,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tramitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`protocolId` int NOT NULL,
	`nup` varchar(32) NOT NULL,
	`fromSectorId` int,
	`toSectorId` int,
	`fromUserId` int,
	`toUserId` int,
	`action` enum('forward','return','assign','conclude','archive','reopen','comment') NOT NULL,
	`dispatch` text,
	`attachments` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tramitations_id` PRIMARY KEY(`id`)
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
CREATE TABLE `userRegistrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`email` varchar(320) NOT NULL,
	`passwordHash` text NOT NULL,
	`cpf` varchar(14),
	`cnpj` varchar(18),
	`phone` varchar(20),
	`googleId` varchar(128),
	`emailVerified` boolean NOT NULL DEFAULT false,
	`emailVerifyToken` varchar(256),
	`passwordResetToken` varchar(256),
	`passwordResetExpiry` timestamp,
	`termsAcceptedAt` timestamp,
	`mfaEnabled` boolean NOT NULL DEFAULT false,
	`mfaSecret` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userRegistrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `userRegistrations_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verifiableDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` enum('protocol','process','document','ombudsman','template','receipt','report','custom') NOT NULL,
	`entityId` int NOT NULL,
	`nup` varchar(32),
	`verificationKey` varchar(128) NOT NULL,
	`documentHash` varchar(256),
	`title` varchar(512) NOT NULL,
	`documentType` varchar(128) NOT NULL,
	`documentNumber` varchar(64),
	`issuingUnit` varchar(256),
	`issuingUserId` int,
	`issuingUserName` varchar(255),
	`status` enum('authentic','invalid','cancelled','replaced','revoked','unavailable') NOT NULL DEFAULT 'authentic',
	`version` int NOT NULL DEFAULT 1,
	`replacedById` int,
	`verificationUrl` varchar(1024),
	`qrCodeData` text,
	`isPublic` boolean NOT NULL DEFAULT true,
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`invalidatedAt` timestamp,
	`invalidationReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verifiableDocuments_id` PRIMARY KEY(`id`),
	CONSTRAINT `verifiableDocuments_verificationKey_unique` UNIQUE(`verificationKey`)
);
--> statement-breakpoint
CREATE TABLE `workflowDeadlines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`instanceId` int NOT NULL,
	`instanceStepId` int,
	`dueAt` timestamp NOT NULL,
	`alertSentAt` timestamp,
	`isOverdue` boolean DEFAULT false,
	`resolvedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `workflowDeadlines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflowDefinitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(300) NOT NULL,
	`description` text,
	`serviceTypeId` int,
	`isActive` boolean DEFAULT true,
	`isDefault` boolean DEFAULT false,
	`version` int DEFAULT 1,
	`createdById` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflowDefinitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflowEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`instanceId` int NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`fromStepId` int,
	`toStepId` int,
	`performedById` int,
	`notes` text,
	`metadata` json,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `workflowEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflowInstanceSteps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`instanceId` int NOT NULL,
	`stepId` int NOT NULL,
	`status` enum('pending','in_progress','completed','skipped','rejected') DEFAULT 'pending',
	`assignedToId` int,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`dueAt` timestamp,
	`notes` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflowInstanceSteps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflowInstances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflowId` int NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`entityId` int NOT NULL,
	`nup` varchar(50),
	`currentStepId` int,
	`status` enum('active','completed','cancelled','suspended','overdue') DEFAULT 'active',
	`startedAt` timestamp DEFAULT (now()),
	`completedAt` timestamp,
	`startedById` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflowInstances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflowStepRules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stepId` int NOT NULL,
	`ruleType` enum('entry','exit','condition') DEFAULT 'condition',
	`field` varchar(200),
	`operator` varchar(50),
	`value` varchar(500),
	`action` varchar(200),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `workflowStepRules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflowSteps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflowId` int NOT NULL,
	`name` varchar(300) NOT NULL,
	`description` text,
	`stepOrder` int NOT NULL,
	`stepType` enum('start','task','decision','approval','notification','document','end') DEFAULT 'task',
	`responsibleRole` varchar(100),
	`responsibleOrgUnitId` int,
	`slaHours` int,
	`isRequired` boolean DEFAULT true,
	`generateDocument` boolean DEFAULT false,
	`documentTemplateId` int,
	`requiresSignature` boolean DEFAULT false,
	`sendNotification` boolean DEFAULT false,
	`notificationTemplate` text,
	`positionX` int DEFAULT 0,
	`positionY` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflowSteps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflowTransitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflowId` int NOT NULL,
	`fromStepId` int NOT NULL,
	`toStepId` int NOT NULL,
	`label` varchar(200),
	`condition` text,
	`isDefault` boolean DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `workflowTransitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `profile` enum('citizen','attendant','sector_server','manager','admin') DEFAULT 'attendant' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `isAgent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `isAvailable` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `sectorId` int;--> statement-breakpoint
CREATE INDEX `allocHist_user_idx` ON `allocationHistory` (`userId`);--> statement-breakpoint
CREATE INDEX `at_msg_idx` ON `audioTranscriptions` (`messageId`);--> statement-breakpoint
CREATE INDEX `at_conv_idx` ON `audioTranscriptions` (`conversationId`);--> statement-breakpoint
CREATE INDEX `at_status_idx` ON `audioTranscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `chl_account_idx` ON `channelHealthLogs` (`accountId`);--> statement-breakpoint
CREATE INDEX `chl_checked_idx` ON `channelHealthLogs` (`checkedAt`);--> statement-breakpoint
CREATE INDEX `css_account_channel_idx` ON `channelSyncState` (`accountId`,`channel`);--> statement-breakpoint
CREATE INDEX `cmr_module_idx` ON `customModuleRecords` (`moduleId`);--> statement-breakpoint
CREATE INDEX `cmr_nup_idx` ON `customModuleRecords` (`nup`);--> statement-breakpoint
CREATE INDEX `da_conv_idx` ON `deliveryAttempts` (`conversationId`);--> statement-breakpoint
CREATE INDEX `da_status_idx` ON `deliveryAttempts` (`status`);--> statement-breakpoint
CREATE INDEX `da_event_idx` ON `deliveryAttempts` (`eventType`);--> statement-breakpoint
CREATE INDEX `ds_doc_idx` ON `documentSignatures` (`verifiableDocumentId`);--> statement-breakpoint
CREATE INDEX `ds_code_idx` ON `documentSignatures` (`accessCode`);--> statement-breakpoint
CREATE INDEX `ds_signer_idx` ON `documentSignatures` (`signerId`);--> statement-breakpoint
CREATE INDEX `me_msg_idx` ON `messageEvents` (`messageId`);--> statement-breakpoint
CREATE INDEX `me_conv_idx` ON `messageEvents` (`conversationId`);--> statement-breakpoint
CREATE INDEX `me_type_idx` ON `messageEvents` (`eventType`);--> statement-breakpoint
CREATE INDEX `nn_nup_idx` ON `nupNotifications` (`nup`);--> statement-breakpoint
CREATE INDEX `nn_entity_idx` ON `nupNotifications` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `nn_contact_idx` ON `nupNotifications` (`contactId`);--> statement-breakpoint
CREATE INDEX `invite_email_idx` ON `orgInvites` (`email`);--> statement-breakpoint
CREATE INDEX `invite_unit_idx` ON `orgInvites` (`orgUnitId`);--> statement-breakpoint
CREATE INDEX `orgUnit_parent_idx` ON `orgUnits` (`parentId`);--> statement-breakpoint
CREATE INDEX `orgUnit_level_idx` ON `orgUnits` (`level`);--> statement-breakpoint
CREATE INDEX `orgUnit_type_idx` ON `orgUnits` (`type`);--> statement-breakpoint
CREATE INDEX `entity_idx` ON `searchIndex` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `nup_idx` ON `searchIndex` (`nup`);--> statement-breakpoint
CREATE INDEX `ss_serviceType_idx` ON `serviceSubjects` (`serviceTypeId`);--> statement-breakpoint
CREATE INDEX `std_serviceType_idx` ON `serviceTypeDocuments` (`serviceTypeId`);--> statement-breakpoint
CREATE INDEX `stf_serviceType_idx` ON `serviceTypeFields` (`serviceTypeId`);--> statement-breakpoint
CREATE INDEX `sd_conv_idx` ON `surveyDispatches` (`conversationId`);--> statement-breakpoint
CREATE INDEX `sd_status_idx` ON `surveyDispatches` (`status`);--> statement-breakpoint
CREATE INDEX `alloc_user_idx` ON `userAllocations` (`userId`);--> statement-breakpoint
CREATE INDEX `alloc_unit_idx` ON `userAllocations` (`orgUnitId`);--> statement-breakpoint
CREATE INDEX `vd_key_idx` ON `verifiableDocuments` (`verificationKey`);--> statement-breakpoint
CREATE INDEX `vd_nup_idx` ON `verifiableDocuments` (`nup`);--> statement-breakpoint
CREATE INDEX `vd_entity_idx` ON `verifiableDocuments` (`entityType`,`entityId`);