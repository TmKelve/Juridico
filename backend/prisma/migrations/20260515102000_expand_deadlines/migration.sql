-- AlterTable
ALTER TABLE "Prazo"
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "legalArea" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "origin" TEXT NOT NULL DEFAULT 'interno',
ADD COLUMN     "responsible" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill
UPDATE "Prazo"
SET
  "status" = CASE
    WHEN "status" = 'pendente' THEN 'aberto'
    WHEN "status" = 'concluido' THEN 'concluido'
    ELSE "status"
  END
WHERE "status" IN ('pendente', 'concluido');
