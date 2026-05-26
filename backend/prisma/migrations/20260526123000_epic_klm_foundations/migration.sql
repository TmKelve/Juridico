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

-- CreateIndex
CREATE INDEX "AiExecution_commandKey_createdAt_idx" ON "AiExecution"("commandKey", "createdAt");
CREATE INDEX "AiExecution_targetType_targetId_idx" ON "AiExecution"("targetType", "targetId");
CREATE INDEX "AiExecution_status_createdAt_idx" ON "AiExecution"("status", "createdAt");
CREATE INDEX "AiExecutionTarget_targetType_targetId_idx" ON "AiExecutionTarget"("targetType", "targetId");
CREATE INDEX "AiExecutionTarget_processId_idx" ON "AiExecutionTarget"("processId");
CREATE INDEX "AiExecutionTarget_clientId_idx" ON "AiExecutionTarget"("clientId");
CREATE UNIQUE INDEX "AiBudgetLedger_ai_budget_scope_period_key" ON "AiBudgetLedger"("scopeType", "scopeId", "commandKey", "periodStart", "periodEnd");
CREATE UNIQUE INDEX "BiMetricDefinition_bi_metric_definition_key_version_key" ON "BiMetricDefinition"("metricKey", "version");
CREATE INDEX "BiMetricDefinition_metricKey_active_idx" ON "BiMetricDefinition"("metricKey", "active");
CREATE UNIQUE INDEX "BiMetricSnapshot_bi_metric_snapshot_unique_key" ON "BiMetricSnapshot"("metricKey", "scopeType", "scopeId", "referenceDate", "windowFrom", "windowTo");
CREATE INDEX "BiMetricSnapshot_dashboardKey_referenceDate_idx" ON "BiMetricSnapshot"("dashboardKey", "referenceDate");
CREATE INDEX "BiMetricSnapshot_scopeType_scopeId_referenceDate_idx" ON "BiMetricSnapshot"("scopeType", "scopeId", "referenceDate");
CREATE INDEX "BiExportJob_dashboardKey_createdAt_idx" ON "BiExportJob"("dashboardKey", "createdAt");
CREATE INDEX "BiExportJob_status_createdAt_idx" ON "BiExportJob"("status", "createdAt");
CREATE INDEX "TimeEntry_userId_startedAt_idx" ON "TimeEntry"("userId", "startedAt");
CREATE INDEX "TimeEntry_teamId_startedAt_idx" ON "TimeEntry"("teamId", "startedAt");
CREATE INDEX "TimeEntry_portfolioId_startedAt_idx" ON "TimeEntry"("portfolioId", "startedAt");
CREATE INDEX "TimeEntry_processId_startedAt_idx" ON "TimeEntry"("processId", "startedAt");
CREATE INDEX "TimeEntry_taskId_startedAt_idx" ON "TimeEntry"("taskId", "startedAt");
CREATE INDEX "TimeEntry_status_startedAt_idx" ON "TimeEntry"("status", "startedAt");
CREATE INDEX "TimeEntryApproval_entryId_createdAt_idx" ON "TimeEntryApproval"("entryId", "createdAt");
CREATE INDEX "TimeEntryApproval_approverUserId_createdAt_idx" ON "TimeEntryApproval"("approverUserId", "createdAt");
CREATE UNIQUE INDEX "TimesheetClosure_timesheet_closure_scope_period_key" ON "TimesheetClosure"("scopeType", "scopeId", "periodStart", "periodEnd");
CREATE INDEX "TimesheetClosure_status_periodStart_periodEnd_idx" ON "TimesheetClosure"("status", "periodStart", "periodEnd");
CREATE UNIQUE INDEX "TimeEntryConflict_time_entry_conflict_entry_fingerprint_key" ON "TimeEntryConflict"("entryId", "fingerprint");
CREATE INDEX "TimeEntryConflict_conflictType_createdAt_idx" ON "TimeEntryConflict"("conflictType", "createdAt");
CREATE UNIQUE INDEX "TimeEntryFinanceLink_time_entry_finance_link_unique_key" ON "TimeEntryFinanceLink"("entryId", "financeEntryId");
CREATE INDEX "TimeEntryFinanceLink_financeEntryId_idx" ON "TimeEntryFinanceLink"("financeEntryId");

-- AddForeignKey
ALTER TABLE "AiExecutionTarget" ADD CONSTRAINT "AiExecutionTarget_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "AiExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Atendimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_agendaEventId_fkey" FOREIGN KEY ("agendaEventId") REFERENCES "AgendaEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimeEntryApproval" ADD CONSTRAINT "TimeEntryApproval_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "TimeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeEntryApproval" ADD CONSTRAINT "TimeEntryApproval_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimesheetClosure" ADD CONSTRAINT "TimesheetClosure_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimeEntryConflict" ADD CONSTRAINT "TimeEntryConflict_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "TimeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeEntryFinanceLink" ADD CONSTRAINT "TimeEntryFinanceLink_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "TimeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeEntryFinanceLink" ADD CONSTRAINT "TimeEntryFinanceLink_financeEntryId_fkey" FOREIGN KEY ("financeEntryId") REFERENCES "FinanceEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
