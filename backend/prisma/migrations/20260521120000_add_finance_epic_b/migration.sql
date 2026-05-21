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

-- CreateIndex
CREATE UNIQUE INDEX "FinanceCategory_code_key" ON "FinanceCategory"("code");

-- CreateIndex
CREATE INDEX "FinanceEntry_type_status_dueDate_idx" ON "FinanceEntry"("type", "status", "dueDate");

-- CreateIndex
CREATE INDEX "FinanceEntry_clientId_status_idx" ON "FinanceEntry"("clientId", "status");

-- CreateIndex
CREATE INDEX "FinanceEntry_processId_status_idx" ON "FinanceEntry"("processId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceCharge_externalId_key" ON "FinanceCharge"("externalId");

-- CreateIndex
CREATE INDEX "FinanceCharge_entryId_status_idx" ON "FinanceCharge"("entryId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "charge_provider_event_unique" ON "FinanceChargeEvent"("chargeId", "providerEventId");

-- CreateIndex
CREATE INDEX "FinanceReconciliationMatch_runId_status_idx" ON "FinanceReconciliationMatch"("runId", "status");

-- CreateIndex
CREATE INDEX "FinanceReconciliationMatch_entryId_status_idx" ON "FinanceReconciliationMatch"("entryId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "collection_schedule_attempt_unique" ON "FinanceCollectionAttempt"("scheduleId", "attemptNumber");

-- CreateIndex
CREATE INDEX "FinanceAuditEvent_scope_occurredAt_idx" ON "FinanceAuditEvent"("scope", "occurredAt");

-- CreateIndex
CREATE INDEX "FinanceAuditEvent_entityType_entityId_idx" ON "FinanceAuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "finance_scope_key" ON "FinanceIdempotencyRequest"("scope", "key");

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_categoryCode_fkey" FOREIGN KEY ("categoryCode") REFERENCES "FinanceCategory"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

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
