ALTER TABLE "Process" ADD COLUMN "processNumber" TEXT;

CREATE UNIQUE INDEX "Process_processNumber_key" ON "Process"("processNumber");
