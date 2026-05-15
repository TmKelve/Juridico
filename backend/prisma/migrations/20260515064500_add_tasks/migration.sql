CREATE TABLE "Task" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "processId" INTEGER,
  "clientId" INTEGER,
  "clientName" TEXT,
  "origin" TEXT NOT NULL DEFAULT 'interno',
  "dueDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pendente',
  "priority" TEXT NOT NULL DEFAULT 'media',
  "owner" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "notes" TEXT,
  "linkedToDeadline" BOOLEAN NOT NULL DEFAULT false,
  "linkedToPublication" BOOLEAN NOT NULL DEFAULT false,
  "linkedToDocument" BOOLEAN NOT NULL DEFAULT false,
  "immediateAction" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_processId_fkey"
  FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
