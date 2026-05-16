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
CREATE TABLE "PublicationCapture" (
    "id" SERIAL NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceReference" TEXT NOT NULL,
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
CREATE TABLE "CrmLead" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER,
    "cpf" TEXT,
    "personName" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'novo',
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CrmLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmOpportunity" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER,
    "cpf" TEXT,
    "personName" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'acao_recomendada',
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CrmOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationEvent" (
    "id" SERIAL NOT NULL,
    "captureId" INTEGER NOT NULL,
    "processId" INTEGER,
    "clientId" INTEGER,
    "publicationId" INTEGER,
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
CREATE TABLE "TriageItem" (
    "id" SERIAL NOT NULL,
    "captureId" INTEGER NOT NULL,
    "eventId" INTEGER,
    "processId" INTEGER,
    "clientId" INTEGER,
    "crmLeadId" INTEGER,
    "crmOpportunityId" INTEGER,
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

-- CreateIndex
CREATE UNIQUE INDEX "PublicationCapture_fingerprint_key" ON "PublicationCapture"("fingerprint");

-- AddForeignKey
ALTER TABLE "PublicationCapture" ADD CONSTRAINT "PublicationCapture_sourceJobId_fkey" FOREIGN KEY ("sourceJobId") REFERENCES "PublicationSourceJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmOpportunity" ADD CONSTRAINT "CrmOpportunity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PublicationEvent" ADD CONSTRAINT "PublicationEvent_captureId_fkey" FOREIGN KEY ("captureId") REFERENCES "PublicationCapture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublicationEvent" ADD CONSTRAINT "PublicationEvent_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PublicationEvent" ADD CONSTRAINT "PublicationEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PublicationEvent" ADD CONSTRAINT "PublicationEvent_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TriageItem" ADD CONSTRAINT "TriageItem_captureId_fkey" FOREIGN KEY ("captureId") REFERENCES "PublicationCapture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TriageItem" ADD CONSTRAINT "TriageItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PublicationEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TriageItem" ADD CONSTRAINT "TriageItem_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TriageItem" ADD CONSTRAINT "TriageItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TriageItem" ADD CONSTRAINT "TriageItem_crmLeadId_fkey" FOREIGN KEY ("crmLeadId") REFERENCES "CrmLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TriageItem" ADD CONSTRAINT "TriageItem_crmOpportunityId_fkey" FOREIGN KEY ("crmOpportunityId") REFERENCES "CrmOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TriageDecision" ADD CONSTRAINT "TriageDecision_triageItemId_fkey" FOREIGN KEY ("triageItemId") REFERENCES "TriageItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
