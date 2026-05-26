-- Publication origin rework: additive traceability columns

ALTER TABLE "Publication"
ADD COLUMN "correlationId" TEXT,
ADD COLUMN "sourceType" TEXT,
ADD COLUMN "sourceReference" TEXT,
ADD COLUMN "originStage" TEXT,
ADD COLUMN "consolidationStatus" TEXT;

ALTER TABLE "PublicationCapture"
ADD COLUMN "correlationId" TEXT,
ADD COLUMN "originStage" TEXT,
ADD COLUMN "pipelineStatus" TEXT,
ADD COLUMN "consolidationStatus" TEXT;

ALTER TABLE "PublicationEvent"
ADD COLUMN "correlationId" TEXT,
ADD COLUMN "sourceType" TEXT,
ADD COLUMN "sourceReference" TEXT,
ADD COLUMN "originStage" TEXT,
ADD COLUMN "pipelineStatus" TEXT;

ALTER TABLE "CrmLead"
ADD COLUMN "correlationId" TEXT,
ADD COLUMN "sourceType" TEXT,
ADD COLUMN "sourceReference" TEXT,
ADD COLUMN "originStage" TEXT,
ADD COLUMN "captureId" INTEGER,
ADD COLUMN "eventId" INTEGER,
ADD COLUMN "publicationId" INTEGER,
ADD COLUMN "consolidationStatus" TEXT;

ALTER TABLE "CrmOpportunity"
ADD COLUMN "correlationId" TEXT,
ADD COLUMN "sourceType" TEXT,
ADD COLUMN "sourceReference" TEXT,
ADD COLUMN "originStage" TEXT,
ADD COLUMN "captureId" INTEGER,
ADD COLUMN "eventId" INTEGER,
ADD COLUMN "publicationId" INTEGER,
ADD COLUMN "consolidationStatus" TEXT;

ALTER TABLE "TriageItem"
ADD COLUMN "correlationId" TEXT,
ADD COLUMN "sourceType" TEXT,
ADD COLUMN "sourceReference" TEXT,
ADD COLUMN "originStage" TEXT,
ADD COLUMN "pipelineStatus" TEXT,
ADD COLUMN "publicationId" INTEGER;

ALTER TABLE "Prazo"
ADD COLUMN "correlationId" TEXT,
ADD COLUMN "sourceType" TEXT,
ADD COLUMN "sourceReference" TEXT,
ADD COLUMN "originStage" TEXT;

ALTER TABLE "Task"
ADD COLUMN "correlationId" TEXT,
ADD COLUMN "sourceType" TEXT,
ADD COLUMN "sourceReference" TEXT,
ADD COLUMN "originStage" TEXT;
