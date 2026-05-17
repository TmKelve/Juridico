ALTER TABLE "CrmLead"
ADD COLUMN "responsible" TEXT,
ADD COLUMN "lastContactAt" TIMESTAMP(3),
ADD COLUMN "nextContactAt" TIMESTAMP(3);

ALTER TABLE "CrmOpportunity"
ADD COLUMN "responsible" TEXT,
ADD COLUMN "lastContactAt" TIMESTAMP(3),
ADD COLUMN "nextContactAt" TIMESTAMP(3);

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

ALTER TABLE "CrmContactEvent"
ADD CONSTRAINT "CrmContactEvent_crmLeadId_fkey"
FOREIGN KEY ("crmLeadId") REFERENCES "CrmLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CrmContactEvent"
ADD CONSTRAINT "CrmContactEvent_crmOpportunityId_fkey"
FOREIGN KEY ("crmOpportunityId") REFERENCES "CrmOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
