-- AlterTable
ALTER TABLE "Atendimento"
  ALTER COLUMN "processId" DROP NOT NULL,
  ADD COLUMN "clientId" INTEGER,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'interno',
  ADD COLUMN "type" TEXT NOT NULL DEFAULT 'rotina',
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'aberto',
  ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'media',
  ADD COLUMN "responsible" TEXT,
  ADD COLUMN "nextStep" TEXT,
  ADD COLUMN "scheduledReturnAt" TIMESTAMP(3),
  ADD COLUMN "critical" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill from linked process/client
UPDATE "Atendimento" AS a
SET
  "clientId" = p."clientId",
  "responsible" = COALESCE(SPLIT_PART(a."actorEmail", '@', 1), a."responsible"),
  "critical" = CASE WHEN p."status" <> 'ativo' THEN true ELSE false END
FROM "Process" AS p
WHERE a."processId" = p."id";

-- AddForeignKey
ALTER TABLE "Atendimento"
  ADD CONSTRAINT "Atendimento_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
