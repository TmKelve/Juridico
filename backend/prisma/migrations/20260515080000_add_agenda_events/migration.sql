-- CreateTable
CREATE TABLE "AgendaEvent" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'agendado',
  "priority" TEXT NOT NULL DEFAULT 'media',
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "processId" INTEGER,
  "clientId" INTEGER,
  "attendanceId" INTEGER,
  "taskId" INTEGER,
  "responsible" TEXT,
  "locationOrChannel" TEXT,
  "notes" TEXT,
  "origin" TEXT NOT NULL DEFAULT 'manual',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AgendaEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgendaEvent_startAt_idx" ON "AgendaEvent"("startAt");

-- CreateIndex
CREATE INDEX "AgendaEvent_processId_idx" ON "AgendaEvent"("processId");

-- CreateIndex
CREATE INDEX "AgendaEvent_clientId_idx" ON "AgendaEvent"("clientId");

-- CreateIndex
CREATE INDEX "AgendaEvent_attendanceId_idx" ON "AgendaEvent"("attendanceId");

-- CreateIndex
CREATE INDEX "AgendaEvent_taskId_idx" ON "AgendaEvent"("taskId");

-- AddForeignKey
ALTER TABLE "AgendaEvent" ADD CONSTRAINT "AgendaEvent_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaEvent" ADD CONSTRAINT "AgendaEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaEvent" ADD CONSTRAINT "AgendaEvent_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Atendimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaEvent" ADD CONSTRAINT "AgendaEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
