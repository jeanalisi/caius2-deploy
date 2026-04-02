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
