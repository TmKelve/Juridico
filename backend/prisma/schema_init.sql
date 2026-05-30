-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('active', 'grace_period', 'read_only', 'suspended', 'cancelled');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('draft', 'checkout_pending', 'active', 'past_due', 'grace_period', 'read_only', 'suspended', 'cancelled');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "phone" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "CompanyStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'draft',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "checkoutReference" TEXT,
    "externalReference" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionTransition" (
    "id" SERIAL NOT NULL,
    "subscriptionId" INTEGER NOT NULL,
    "fromStatus" "SubscriptionStatus" NOT NULL,
    "toStatus" "SubscriptionStatus" NOT NULL,
    "reason" TEXT,
    "actor" TEXT,
    "idempotencyKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMembership" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "primaryOwnerUserId" INTEGER NOT NULL,
    "backupOwnerUserId" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioMember" (
    "id" SERIAL NOT NULL,
    "portfolioId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "isBackup" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PF',
    "cpfCnpj" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "legalArea" TEXT,
    "responsible" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Process" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "processNumber" TEXT,
    "client" TEXT NOT NULL,
    "clientId" INTEGER,
    "phase" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "ownerId" INTEGER NOT NULL,

    CONSTRAINT "Process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publication" (
    "id" SERIAL NOT NULL,
    "processId" INTEGER NOT NULL,
    "clientId" INTEGER,
    "publicationType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'nova',
    "impact" TEXT NOT NULL DEFAULT 'medio',
    "tribunal" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "relevantText" TEXT NOT NULL,
    "requiresAction" BOOLEAN NOT NULL DEFAULT false,
    "convertedToDeadline" BOOLEAN NOT NULL DEFAULT false,
    "derivedDeadlineLabel" TEXT,
    "derivedDeadlineId" INTEGER,
    "correlationId" TEXT,
    "sourceType" TEXT,
    "sourceReference" TEXT,
    "originStage" TEXT,
    "consolidationStatus" TEXT,
    "notes" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationCapture" (
    "id" SERIAL NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceReference" TEXT NOT NULL,
    "correlationId" TEXT,
    "originStage" TEXT,
    "pipelineStatus" TEXT,
    "consolidationStatus" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "rawText" TEXT NOT NULL,
    "normalizedText" TEXT NOT NULL,
    "tribunal" TEXT,
    "processNumber" TEXT,
    "oabNumber" TEXT,
    "lawyerName" TEXT,
    "cpf" TEXT,
    "personName" TEXT,
    "metadataJson" JSONB NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'novo',
    "sourceJobId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicationCapture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationEvent" (
    "id" SERIAL NOT NULL,
    "captureId" INTEGER NOT NULL,
    "processId" INTEGER,
    "clientId" INTEGER,
    "publicationId" INTEGER,
    "correlationId" TEXT,
    "sourceType" TEXT,
    "sourceReference" TEXT,
    "originStage" TEXT,
    "pipelineStatus" TEXT,
    "eventType" TEXT NOT NULL,
    "eventAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "fullText" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'normal',
    "requiresAction" BOOLEAN NOT NULL DEFAULT false,
    "timelinePosition" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationSourceJob" (
    "id" SERIAL NOT NULL,
    "sourceType" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "itemsCaptured" INTEGER NOT NULL DEFAULT 0,
    "itemsCreated" INTEGER NOT NULL DEFAULT 0,
    "itemsUpdated" INTEGER NOT NULL DEFAULT 0,
    "itemsFlaggedCritical" INTEGER NOT NULL DEFAULT 0,
    "itemsSentToCrm" INTEGER NOT NULL DEFAULT 0,
    "errorLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicationSourceJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmLead" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER,
    "cpf" TEXT,
    "personName" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "correlationId" TEXT,
    "sourceType" TEXT,
    "sourceReference" TEXT,
    "originStage" TEXT,
    "captureId" INTEGER,
    "eventId" INTEGER,
    "publicationId" INTEGER,
    "consolidationStatus" TEXT,
    "status" TEXT NOT NULL DEFAULT 'novo',
    "responsible" TEXT,
    "summary" TEXT NOT NULL,
    "lastContactAt" TIMESTAMP(3),
    "nextContactAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmOpportunity" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER,
    "convertedProcessId" INTEGER,
    "cpf" TEXT,
    "personName" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "correlationId" TEXT,
    "sourceType" TEXT,
    "sourceReference" TEXT,
    "originStage" TEXT,
    "captureId" INTEGER,
    "eventId" INTEGER,
    "publicationId" INTEGER,
    "consolidationStatus" TEXT,
    "status" TEXT NOT NULL DEFAULT 'acao_recomendada',
    "responsible" TEXT,
    "summary" TEXT NOT NULL,
    "lastContactAt" TIMESTAMP(3),
    "nextContactAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmContactEvent" (
    "id" SERIAL NOT NULL,
    "crmLeadId" INTEGER,
    "crmOpportunityId" INTEGER,
    "kind" TEXT NOT NULL DEFAULT 'contato',
    "summary" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmContactEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmOpportunityDocumentAttachment" (
    "id" SERIAL NOT NULL,
    "crmOpportunityId" INTEGER NOT NULL,
    "documentId" INTEGER,
    "titleSnapshot" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Checklist',
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "previewUrl" TEXT,
    "requiredChecklist" BOOLEAN NOT NULL DEFAULT false,
    "pendingForAdvance" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responsible" TEXT,
    "createdBy" TEXT,
    "externalDocumentId" TEXT,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmOpportunityDocumentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmAuditEvent" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "actor" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "correlationId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmIdempotencyRequest" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER,
    "action" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "responseCode" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "auditEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmIdempotencyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriageItem" (
    "id" SERIAL NOT NULL,
    "captureId" INTEGER NOT NULL,
    "eventId" INTEGER,
    "processId" INTEGER,
    "clientId" INTEGER,
    "crmLeadId" INTEGER,
    "crmOpportunityId" INTEGER,
    "correlationId" TEXT,
    "sourceType" TEXT,
    "sourceReference" TEXT,
    "originStage" TEXT,
    "pipelineStatus" TEXT,
    "publicationId" INTEGER,
    "queueType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "suggestedAction" TEXT NOT NULL,
    "suggestedReason" TEXT NOT NULL,
    "aiConfidenceBand" TEXT,
    "aiScoreRaw" DOUBLE PRECISION,
    "postponeUntil" TIMESTAMP(3),
    "assignedQueue" TEXT NOT NULL DEFAULT 'fila_central',
    "handledBy" TEXT,
    "handledAt" TIMESTAMP(3),
    "discardReason" TEXT,
    "discardNote" TEXT,
    "sourceLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TriageItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriageDecision" (
    "id" SERIAL NOT NULL,
    "triageItemId" INTEGER NOT NULL,
    "decisionType" TEXT NOT NULL,
    "decisionReason" TEXT,
    "decisionNote" TEXT,
    "decidedBy" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedTaskId" INTEGER,
    "generatedDeadlineId" INTEGER,
    "generatedLeadId" INTEGER,
    "generatedOpportunityId" INTEGER,

    CONSTRAINT "TriageDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Andamento" (
    "id" SERIAL NOT NULL,
    "processId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorEmail" TEXT NOT NULL,

    CONSTRAINT "Andamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prazo" (
    "id" SERIAL NOT NULL,
    "processId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aberto',
    "priority" TEXT NOT NULL DEFAULT 'media',
    "origin" TEXT NOT NULL DEFAULT 'interno',
    "responsible" TEXT,
    "legalArea" TEXT,
    "notes" TEXT,
    "publicationId" INTEGER,
    "correlationId" TEXT,
    "sourceType" TEXT,
    "sourceReference" TEXT,
    "originStage" TEXT,
    "agendaEventId" INTEGER,
    "agendaSyncStatus" TEXT DEFAULT 'missing',
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "completionJustification" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prazo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" SERIAL NOT NULL,
    "processId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "category" TEXT NOT NULL DEFAULT 'Checklist',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isLatestVersion" BOOLEAN NOT NULL DEFAULT true,
    "origin" TEXT NOT NULL DEFAULT 'interno',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responsible" TEXT,
    "requiredChecklist" BOOLEAN NOT NULL DEFAULT false,
    "pendingForAdvance" BOOLEAN NOT NULL DEFAULT false,
    "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "previewUrl" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Atendimento" (
    "id" SERIAL NOT NULL,
    "processId" INTEGER,
    "clientId" INTEGER,
    "responsibleUserId" INTEGER,
    "teamId" INTEGER,
    "portfolioId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" TEXT NOT NULL DEFAULT 'interno',
    "type" TEXT NOT NULL DEFAULT 'rotina',
    "status" TEXT NOT NULL DEFAULT 'aberto',
    "priority" TEXT NOT NULL DEFAULT 'media',
    "responsible" TEXT,
    "nextStep" TEXT,
    "scheduledReturnAt" TIMESTAMP(3),
    "critical" BOOLEAN NOT NULL DEFAULT false,
    "slaPolicyCode" TEXT NOT NULL DEFAULT 'default',
    "slaTargetAt" TIMESTAMP(3),
    "slaBreachedAt" TIMESTAMP(3),
    "convertedTaskId" INTEGER,
    "convertedDeadlineId" INTEGER,
    "actorEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Atendimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "processId" INTEGER,
    "clientId" INTEGER,
    "ownerUserId" INTEGER,
    "teamId" INTEGER,
    "portfolioId" INTEGER,
    "clientName" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'interno',
    "correlationId" TEXT,
    "sourceType" TEXT,
    "sourceReference" TEXT,
    "originStage" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "priority" TEXT NOT NULL DEFAULT 'media',
    "workflowStage" TEXT NOT NULL DEFAULT 'captura',
    "owner" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "notes" TEXT,
    "linkedToDeadline" BOOLEAN NOT NULL DEFAULT false,
    "linkedToPublication" BOOLEAN NOT NULL DEFAULT false,
    "linkedToDocument" BOOLEAN NOT NULL DEFAULT false,
    "immediateAction" BOOLEAN NOT NULL DEFAULT false,
    "slaTargetAt" TIMESTAMP(3),
    "followupState" TEXT NOT NULL DEFAULT 'idle',
    "lastFollowupAt" TIMESTAMP(3),
    "breachedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskLink" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskFollowupSchedule" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "followupAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'in_app',
    "state" TEXT NOT NULL DEFAULT 'scheduled',
    "dedupeKey" TEXT NOT NULL,
    "dispatchedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskFollowupSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskHistory" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "fromOwnerUserId" INTEGER,
    "toOwnerUserId" INTEGER,
    "fromTeamId" INTEGER,
    "toTeamId" INTEGER,
    "actor" TEXT NOT NULL,
    "details" JSONB,
    "correlationId" TEXT,
    "idempotencyKey" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceHistory" (
    "id" SERIAL NOT NULL,
    "attendanceId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "fromResponsibleUserId" INTEGER,
    "toResponsibleUserId" INTEGER,
    "fromTeamId" INTEGER,
    "toTeamId" INTEGER,
    "actor" TEXT NOT NULL,
    "details" JSONB,
    "correlationId" TEXT,
    "idempotencyKey" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkAuditEvent" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "actor" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "correlationId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkIdempotencyRequest" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "responseCode" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "auditEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkIdempotencyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiExecution" (
    "id" TEXT NOT NULL,
    "commandKey" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "inputHash" TEXT,
    "outputHash" TEXT,
    "maskedInput" JSONB,
    "outputPayload" JSONB,
    "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
    "guardrailStatus" TEXT NOT NULL DEFAULT 'passed',
    "tokenUsageInput" INTEGER NOT NULL DEFAULT 0,
    "tokenUsageOutput" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DECIMAL(12,6),
    "latencyMs" INTEGER,
    "actor" TEXT NOT NULL,
    "correlationId" TEXT,
    "idempotencyKey" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiExecutionTarget" (
    "id" SERIAL NOT NULL,
    "executionId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "processId" INTEGER,
    "clientId" INTEGER,
    "portfolioId" INTEGER,
    "teamId" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiExecutionTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiBudgetLedger" (
    "id" SERIAL NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "commandKey" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "tokenUsageInput" INTEGER NOT NULL DEFAULT 0,
    "tokenUsageOutput" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "hardLimitUsd" DECIMAL(12,6),
    "softLimitUsd" DECIMAL(12,6),
    "lastExecutionId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiBudgetLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiMetricDefinition" (
    "id" SERIAL NOT NULL,
    "metricKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "sourceOfTruth" TEXT NOT NULL,
    "ownerDomain" TEXT NOT NULL,
    "dashboardKeys" JSONB NOT NULL,
    "timezonePolicy" TEXT NOT NULL,
    "aggregationPolicy" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BiMetricDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiMetricSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotKey" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "dashboardKey" TEXT,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "referenceDate" TIMESTAMP(3) NOT NULL,
    "windowFrom" TIMESTAMP(3) NOT NULL,
    "windowTo" TIMESTAMP(3) NOT NULL,
    "asOf" TIMESTAMP(3),
    "valueNumeric" DECIMAL(18,4),
    "valueText" TEXT,
    "deltaNumeric" DECIMAL(18,4),
    "series" JSONB,
    "dimensions" JSONB,
    "definitionVersion" TEXT NOT NULL,
    "sourceHash" TEXT,
    "generatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiMetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiExportJob" (
    "id" TEXT NOT NULL,
    "dashboardKey" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "asOf" TIMESTAMP(3),
    "snapshotId" TEXT,
    "filters" JSONB NOT NULL,
    "artifactPath" TEXT,
    "requestedBy" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BiExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "teamId" INTEGER,
    "portfolioId" INTEGER,
    "clientId" INTEGER,
    "processId" INTEGER,
    "taskId" INTEGER,
    "attendanceId" INTEGER,
    "agendaEventId" INTEGER,
    "activityType" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "durationMinutes" INTEGER NOT NULL,
    "billableMinutes" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'manual',
    "createdByUserId" INTEGER,
    "approvedByUserId" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "correlationId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntryApproval" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT,
    "approverUserId" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeEntryApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimesheetClosure" (
    "id" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'closed',
    "closedByUserId" INTEGER NOT NULL,
    "reason" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimesheetClosure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntryConflict" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "conflictType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeEntryConflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntryFinanceLink" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "financeEntryId" INTEGER NOT NULL,
    "linkType" TEXT NOT NULL,
    "allocatedCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeEntryFinanceLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductivitySnapshot" (
    "id" SERIAL NOT NULL,
    "referenceDate" TIMESTAMP(3) NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "tasksOverdue" INTEGER NOT NULL DEFAULT 0,
    "attendancesHandled" INTEGER NOT NULL DEFAULT 0,
    "slaBreaches" INTEGER NOT NULL DEFAULT 0,
    "avgResolutionHours" DOUBLE PRECISION,
    "reassignments" INTEGER NOT NULL DEFAULT 0,
    "metrics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductivitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendaEvent" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'agendado',
    "priority" TEXT NOT NULL DEFAULT 'media',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "processId" INTEGER,
    "clientId" INTEGER,
    "attendanceId" INTEGER,
    "taskId" INTEGER,
    "responsible" TEXT,
    "locationOrChannel" TEXT,
    "notes" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'manual',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgendaEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "legalArea" TEXT NOT NULL,
    "pieceType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "official" BOOLEAN NOT NULL DEFAULT false,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "autoFill" BOOLEAN NOT NULL DEFAULT false,
    "phase" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v1.0',
    "updatedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "placeholders" JSONB NOT NULL,
    "preview" TEXT NOT NULL,
    "versionsJson" JSONB NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceCategory" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceEntry" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "settledAmountCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "settlementDate" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "referenceNumber" TEXT,
    "clientId" INTEGER,
    "processId" INTEGER,
    "installmentPlanId" INTEGER,
    "installmentNumber" INTEGER,
    "categoryCode" TEXT NOT NULL,
    "responsibleUserId" INTEGER,
    "notes" TEXT,
    "externalRef" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceInstallmentPlan" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "clientId" INTEGER,
    "processId" INTEGER,
    "categoryCode" TEXT NOT NULL,
    "installmentCount" INTEGER NOT NULL,
    "installmentAmountCents" INTEGER NOT NULL,
    "totalAmountCents" INTEGER NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "firstDueDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceInstallmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceCharge" (
    "id" SERIAL NOT NULL,
    "entryId" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "externalId" TEXT NOT NULL,
    "paymentUrl" TEXT,
    "pixCode" TEXT,
    "boletoBarcode" TEXT,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "amountCents" INTEGER NOT NULL,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "providerPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceChargeEvent" (
    "id" SERIAL NOT NULL,
    "chargeId" INTEGER NOT NULL,
    "providerEventId" TEXT,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceChargeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceReconciliationRun" (
    "id" SERIAL NOT NULL,
    "referenceDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "importedLines" INTEGER NOT NULL DEFAULT 0,
    "matchedLines" INTEGER NOT NULL DEFAULT 0,
    "unmatchedLines" INTEGER NOT NULL DEFAULT 0,
    "summaryJson" JSONB NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceReconciliationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceReconciliationMatch" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "entryId" INTEGER,
    "externalId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "matchedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceReconciliationMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceCollectionSchedule" (
    "id" SERIAL NOT NULL,
    "entryId" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "cadenceDays" INTEGER NOT NULL,
    "maxAttempts" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastAttemptAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "templateCode" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceCollectionSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceCollectionAttempt" (
    "id" SERIAL NOT NULL,
    "scheduleId" INTEGER NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "channel" TEXT NOT NULL,
    "destination" TEXT,
    "message" TEXT NOT NULL,
    "providerPayload" JSONB NOT NULL,
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceCollectionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceAuditEvent" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "actor" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "correlationId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceIdempotencyRequest" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "responseCode" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "auditEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceIdempotencyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingInvoice" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "planCode" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "externalRef" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "providerInvoiceId" TEXT NOT NULL,
    "providerEventId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "checkoutUrl" TEXT,
    "pixCode" TEXT,
    "boletoUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "providerPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingEvent" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "invoiceId" INTEGER,
    "paymentAttemptId" INTEGER,
    "eventType" TEXT NOT NULL,
    "eventStatus" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metadataJson" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "recipientUserId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT NOT NULL DEFAULT '/',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");

-- CreateIndex
CREATE INDEX "Plan_active_code_idx" ON "Plan"("active", "code");

-- CreateIndex
CREATE INDEX "Subscription_companyId_status_idx" ON "Subscription"("companyId", "status");

-- CreateIndex
CREATE INDEX "Subscription_planId_status_idx" ON "Subscription"("planId", "status");

-- CreateIndex
CREATE INDEX "SubscriptionTransition_subscriptionId_createdAt_idx" ON "SubscriptionTransition"("subscriptionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionTransition_subscriptionId_idempotencyKey_key" ON "SubscriptionTransition"("subscriptionId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "CompanyMembership_userId_active_idx" ON "CompanyMembership"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMembership_companyId_userId_key" ON "CompanyMembership"("companyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Portfolio_code_key" ON "Portfolio"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Portfolio_teamId_name_key" ON "Portfolio"("teamId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioMember_portfolioId_userId_key" ON "PortfolioMember"("portfolioId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_name_key" ON "Client"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Process_processNumber_key" ON "Process"("processNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PublicationCapture_fingerprint_key" ON "PublicationCapture"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "CrmIdempotencyRequest_scope_key_key" ON "CrmIdempotencyRequest"("scope", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Prazo_agendaEventId_key" ON "Prazo"("agendaEventId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskLink_taskId_entityType_entityId_key" ON "TaskLink"("taskId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskFollowupSchedule_dedupeKey_key" ON "TaskFollowupSchedule"("dedupeKey");

-- CreateIndex
CREATE INDEX "TaskFollowupSchedule_state_followupAt_idx" ON "TaskFollowupSchedule"("state", "followupAt");

-- CreateIndex
CREATE INDEX "TaskHistory_taskId_occurredAt_idx" ON "TaskHistory"("taskId", "occurredAt");

-- CreateIndex
CREATE INDEX "AttendanceHistory_attendanceId_occurredAt_idx" ON "AttendanceHistory"("attendanceId", "occurredAt");

-- CreateIndex
CREATE INDEX "WorkAuditEvent_scope_occurredAt_idx" ON "WorkAuditEvent"("scope", "occurredAt");

-- CreateIndex
CREATE INDEX "WorkAuditEvent_entityType_entityId_idx" ON "WorkAuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkIdempotencyRequest_scope_key_key" ON "WorkIdempotencyRequest"("scope", "key");

-- CreateIndex
CREATE INDEX "AiExecution_commandKey_createdAt_idx" ON "AiExecution"("commandKey", "createdAt");

-- CreateIndex
CREATE INDEX "AiExecution_targetType_targetId_idx" ON "AiExecution"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AiExecution_status_createdAt_idx" ON "AiExecution"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AiExecutionTarget_targetType_targetId_idx" ON "AiExecutionTarget"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AiExecutionTarget_processId_idx" ON "AiExecutionTarget"("processId");

-- CreateIndex
CREATE INDEX "AiExecutionTarget_clientId_idx" ON "AiExecutionTarget"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "AiBudgetLedger_scopeType_scopeId_commandKey_periodStart_per_key" ON "AiBudgetLedger"("scopeType", "scopeId", "commandKey", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "BiMetricDefinition_metricKey_active_idx" ON "BiMetricDefinition"("metricKey", "active");

-- CreateIndex
CREATE UNIQUE INDEX "BiMetricDefinition_metricKey_version_key" ON "BiMetricDefinition"("metricKey", "version");

-- CreateIndex
CREATE INDEX "BiMetricSnapshot_dashboardKey_referenceDate_idx" ON "BiMetricSnapshot"("dashboardKey", "referenceDate");

-- CreateIndex
CREATE INDEX "BiMetricSnapshot_scopeType_scopeId_referenceDate_idx" ON "BiMetricSnapshot"("scopeType", "scopeId", "referenceDate");

-- CreateIndex
CREATE UNIQUE INDEX "BiMetricSnapshot_metricKey_scopeType_scopeId_referenceDate__key" ON "BiMetricSnapshot"("metricKey", "scopeType", "scopeId", "referenceDate", "windowFrom", "windowTo");

-- CreateIndex
CREATE INDEX "BiExportJob_dashboardKey_createdAt_idx" ON "BiExportJob"("dashboardKey", "createdAt");

-- CreateIndex
CREATE INDEX "BiExportJob_status_createdAt_idx" ON "BiExportJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TimeEntry_userId_startedAt_idx" ON "TimeEntry"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "TimeEntry_teamId_startedAt_idx" ON "TimeEntry"("teamId", "startedAt");

-- CreateIndex
CREATE INDEX "TimeEntry_portfolioId_startedAt_idx" ON "TimeEntry"("portfolioId", "startedAt");

-- CreateIndex
CREATE INDEX "TimeEntry_processId_startedAt_idx" ON "TimeEntry"("processId", "startedAt");

-- CreateIndex
CREATE INDEX "TimeEntry_taskId_startedAt_idx" ON "TimeEntry"("taskId", "startedAt");

-- CreateIndex
CREATE INDEX "TimeEntry_status_startedAt_idx" ON "TimeEntry"("status", "startedAt");

-- CreateIndex
CREATE INDEX "TimeEntryApproval_entryId_createdAt_idx" ON "TimeEntryApproval"("entryId", "createdAt");

-- CreateIndex
CREATE INDEX "TimeEntryApproval_approverUserId_createdAt_idx" ON "TimeEntryApproval"("approverUserId", "createdAt");

-- CreateIndex
CREATE INDEX "TimesheetClosure_status_periodStart_periodEnd_idx" ON "TimesheetClosure"("status", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "TimesheetClosure_scopeType_scopeId_periodStart_periodEnd_key" ON "TimesheetClosure"("scopeType", "scopeId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "TimeEntryConflict_conflictType_createdAt_idx" ON "TimeEntryConflict"("conflictType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntryConflict_entryId_fingerprint_key" ON "TimeEntryConflict"("entryId", "fingerprint");

-- CreateIndex
CREATE INDEX "TimeEntryFinanceLink_financeEntryId_idx" ON "TimeEntryFinanceLink"("financeEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntryFinanceLink_entryId_financeEntryId_key" ON "TimeEntryFinanceLink"("entryId", "financeEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductivitySnapshot_referenceDate_scopeType_scopeId_key" ON "ProductivitySnapshot"("referenceDate", "scopeType", "scopeId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceCategory_code_key" ON "FinanceCategory"("code");

-- CreateIndex
CREATE INDEX "FinanceEntry_type_status_dueDate_idx" ON "FinanceEntry"("type", "status", "dueDate");

-- CreateIndex
CREATE INDEX "FinanceEntry_clientId_status_idx" ON "FinanceEntry"("clientId", "status");

-- CreateIndex
CREATE INDEX "FinanceEntry_processId_status_idx" ON "FinanceEntry"("processId", "status");

-- CreateIndex
CREATE INDEX "FinanceEntry_installmentPlanId_installmentNumber_idx" ON "FinanceEntry"("installmentPlanId", "installmentNumber");

-- CreateIndex
CREATE INDEX "FinanceInstallmentPlan_clientId_active_idx" ON "FinanceInstallmentPlan"("clientId", "active");

-- CreateIndex
CREATE INDEX "FinanceInstallmentPlan_processId_active_idx" ON "FinanceInstallmentPlan"("processId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceCharge_externalId_key" ON "FinanceCharge"("externalId");

-- CreateIndex
CREATE INDEX "FinanceCharge_entryId_status_idx" ON "FinanceCharge"("entryId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceChargeEvent_chargeId_providerEventId_key" ON "FinanceChargeEvent"("chargeId", "providerEventId");

-- CreateIndex
CREATE INDEX "FinanceReconciliationMatch_runId_status_idx" ON "FinanceReconciliationMatch"("runId", "status");

-- CreateIndex
CREATE INDEX "FinanceReconciliationMatch_entryId_status_idx" ON "FinanceReconciliationMatch"("entryId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceCollectionAttempt_scheduleId_attemptNumber_key" ON "FinanceCollectionAttempt"("scheduleId", "attemptNumber");

-- CreateIndex
CREATE INDEX "FinanceAuditEvent_scope_occurredAt_idx" ON "FinanceAuditEvent"("scope", "occurredAt");

-- CreateIndex
CREATE INDEX "FinanceAuditEvent_entityType_entityId_idx" ON "FinanceAuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceIdempotencyRequest_scope_key_key" ON "FinanceIdempotencyRequest"("scope", "key");

-- CreateIndex
CREATE INDEX "BillingInvoice_companyId_status_dueDate_idx" ON "BillingInvoice"("companyId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "PaymentAttempt_provider_providerInvoiceId_idx" ON "PaymentAttempt"("provider", "providerInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_invoiceId_attemptNumber_key" ON "PaymentAttempt"("invoiceId", "attemptNumber");

-- CreateIndex
CREATE INDEX "BillingEvent_companyId_occurredAt_idx" ON "BillingEvent"("companyId", "occurredAt");

-- CreateIndex
CREATE INDEX "BillingEvent_invoiceId_occurredAt_idx" ON "BillingEvent"("invoiceId", "occurredAt");

-- CreateIndex
CREATE INDEX "BillingEvent_paymentAttemptId_occurredAt_idx" ON "BillingEvent"("paymentAttemptId", "occurredAt");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionTransition" ADD CONSTRAINT "SubscriptionTransition_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_primaryOwnerUserId_fkey" FOREIGN KEY ("primaryOwnerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_backupOwnerUserId_fkey" FOREIGN KEY ("backupOwnerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioMember" ADD CONSTRAINT "PortfolioMember_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioMember" ADD CONSTRAINT "PortfolioMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationCapture" ADD CONSTRAINT "PublicationCapture_sourceJobId_fkey" FOREIGN KEY ("sourceJobId") REFERENCES "PublicationSourceJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationEvent" ADD CONSTRAINT "PublicationEvent_captureId_fkey" FOREIGN KEY ("captureId") REFERENCES "PublicationCapture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationEvent" ADD CONSTRAINT "PublicationEvent_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationEvent" ADD CONSTRAINT "PublicationEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationEvent" ADD CONSTRAINT "PublicationEvent_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmOpportunity" ADD CONSTRAINT "CrmOpportunity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmContactEvent" ADD CONSTRAINT "CrmContactEvent_crmLeadId_fkey" FOREIGN KEY ("crmLeadId") REFERENCES "CrmLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmContactEvent" ADD CONSTRAINT "CrmContactEvent_crmOpportunityId_fkey" FOREIGN KEY ("crmOpportunityId") REFERENCES "CrmOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmOpportunityDocumentAttachment" ADD CONSTRAINT "CrmOpportunityDocumentAttachment_crmOpportunityId_fkey" FOREIGN KEY ("crmOpportunityId") REFERENCES "CrmOpportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmOpportunityDocumentAttachment" ADD CONSTRAINT "CrmOpportunityDocumentAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriageItem" ADD CONSTRAINT "TriageItem_captureId_fkey" FOREIGN KEY ("captureId") REFERENCES "PublicationCapture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriageItem" ADD CONSTRAINT "TriageItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PublicationEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriageItem" ADD CONSTRAINT "TriageItem_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriageItem" ADD CONSTRAINT "TriageItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriageItem" ADD CONSTRAINT "TriageItem_crmLeadId_fkey" FOREIGN KEY ("crmLeadId") REFERENCES "CrmLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriageItem" ADD CONSTRAINT "TriageItem_crmOpportunityId_fkey" FOREIGN KEY ("crmOpportunityId") REFERENCES "CrmOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriageDecision" ADD CONSTRAINT "TriageDecision_triageItemId_fkey" FOREIGN KEY ("triageItemId") REFERENCES "TriageItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Andamento" ADD CONSTRAINT "Andamento_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prazo" ADD CONSTRAINT "Prazo_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prazo" ADD CONSTRAINT "Prazo_agendaEventId_fkey" FOREIGN KEY ("agendaEventId") REFERENCES "AgendaEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atendimento" ADD CONSTRAINT "Atendimento_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atendimento" ADD CONSTRAINT "Atendimento_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atendimento" ADD CONSTRAINT "Atendimento_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atendimento" ADD CONSTRAINT "Atendimento_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atendimento" ADD CONSTRAINT "Atendimento_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskLink" ADD CONSTRAINT "TaskLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskFollowupSchedule" ADD CONSTRAINT "TaskFollowupSchedule_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskHistory" ADD CONSTRAINT "TaskHistory_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceHistory" ADD CONSTRAINT "AttendanceHistory_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Atendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiExecutionTarget" ADD CONSTRAINT "AiExecutionTarget_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "AiExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Atendimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_agendaEventId_fkey" FOREIGN KEY ("agendaEventId") REFERENCES "AgendaEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntryApproval" ADD CONSTRAINT "TimeEntryApproval_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "TimeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntryApproval" ADD CONSTRAINT "TimeEntryApproval_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetClosure" ADD CONSTRAINT "TimesheetClosure_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntryConflict" ADD CONSTRAINT "TimeEntryConflict_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "TimeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntryFinanceLink" ADD CONSTRAINT "TimeEntryFinanceLink_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "TimeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntryFinanceLink" ADD CONSTRAINT "TimeEntryFinanceLink_financeEntryId_fkey" FOREIGN KEY ("financeEntryId") REFERENCES "FinanceEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaEvent" ADD CONSTRAINT "AgendaEvent_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaEvent" ADD CONSTRAINT "AgendaEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaEvent" ADD CONSTRAINT "AgendaEvent_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Atendimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaEvent" ADD CONSTRAINT "AgendaEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_installmentPlanId_fkey" FOREIGN KEY ("installmentPlanId") REFERENCES "FinanceInstallmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_categoryCode_fkey" FOREIGN KEY ("categoryCode") REFERENCES "FinanceCategory"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceInstallmentPlan" ADD CONSTRAINT "FinanceInstallmentPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceInstallmentPlan" ADD CONSTRAINT "FinanceInstallmentPlan_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceInstallmentPlan" ADD CONSTRAINT "FinanceInstallmentPlan_categoryCode_fkey" FOREIGN KEY ("categoryCode") REFERENCES "FinanceCategory"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceCharge" ADD CONSTRAINT "FinanceCharge_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FinanceEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceChargeEvent" ADD CONSTRAINT "FinanceChargeEvent_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "FinanceCharge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceReconciliationMatch" ADD CONSTRAINT "FinanceReconciliationMatch_runId_fkey" FOREIGN KEY ("runId") REFERENCES "FinanceReconciliationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceReconciliationMatch" ADD CONSTRAINT "FinanceReconciliationMatch_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FinanceEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceCollectionSchedule" ADD CONSTRAINT "FinanceCollectionSchedule_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FinanceEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceCollectionAttempt" ADD CONSTRAINT "FinanceCollectionAttempt_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "FinanceCollectionSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "BillingInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "BillingInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

