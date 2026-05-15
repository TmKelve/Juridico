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

-- AlterTable
ALTER TABLE "Process" ADD COLUMN "clientId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Client_name_key" ON "Client"("name");

-- Backfill clients from existing processes
INSERT INTO "Client" ("name", "type", "status", "notes", "createdAt")
SELECT DISTINCT "client", 'PJ', 'ativo', 'Cliente sincronizado a partir da carteira de processos.', CURRENT_TIMESTAMP
FROM "Process"
WHERE "client" IS NOT NULL AND BTRIM("client") <> ''
ON CONFLICT ("name") DO NOTHING;

UPDATE "Process" AS p
SET "clientId" = c."id"
FROM "Client" AS c
WHERE p."clientId" IS NULL
  AND p."client" = c."name";

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
