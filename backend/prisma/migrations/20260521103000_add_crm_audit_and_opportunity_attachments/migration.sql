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

CREATE UNIQUE INDEX "CrmIdempotencyRequest_scope_key_key" ON "CrmIdempotencyRequest"("scope", "key");

ALTER TABLE "CrmOpportunityDocumentAttachment"
ADD CONSTRAINT "CrmOpportunityDocumentAttachment_crmOpportunityId_fkey"
FOREIGN KEY ("crmOpportunityId") REFERENCES "CrmOpportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CrmOpportunityDocumentAttachment"
ADD CONSTRAINT "CrmOpportunityDocumentAttachment_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "Documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Prazo"
ADD COLUMN "publicationId" INTEGER,
ADD COLUMN "agendaEventId" INTEGER,
ADD COLUMN "agendaSyncStatus" TEXT DEFAULT 'missing',
ADD COLUMN "completedBy" TEXT,
ADD COLUMN "completionJustification" TEXT;

CREATE UNIQUE INDEX "Prazo_agendaEventId_key" ON "Prazo"("agendaEventId");

ALTER TABLE "Prazo"
ADD CONSTRAINT "Prazo_agendaEventId_fkey"
FOREIGN KEY ("agendaEventId") REFERENCES "AgendaEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
