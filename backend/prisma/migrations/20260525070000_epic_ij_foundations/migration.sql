-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "primaryOwnerUserId" INTEGER NOT NULL,
    "backupOwnerUserId" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioMember" (
    "id" SERIAL NOT NULL,
    "portfolioId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "isBackup" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskLink" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskFollowupSchedule" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "followupAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'in_app',
    "state" TEXT NOT NULL DEFAULT 'scheduled',
    "dedupeKey" TEXT NOT NULL,
    "dispatchedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskFollowupSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskHistory" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "fromOwnerUserId" INTEGER,
    "toOwnerUserId" INTEGER,
    "fromTeamId" INTEGER,
    "toTeamId" INTEGER,
    "actor" TEXT NOT NULL,
    "details" JSONB,
    "correlationId" TEXT,
    "idempotencyKey" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceHistory" (
    "id" SERIAL NOT NULL,
    "attendanceId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "fromResponsibleUserId" INTEGER,
    "toResponsibleUserId" INTEGER,
    "fromTeamId" INTEGER,
    "toTeamId" INTEGER,
    "actor" TEXT NOT NULL,
    "details" JSONB,
    "correlationId" TEXT,
    "idempotencyKey" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkAuditEvent" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "actor" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "correlationId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkIdempotencyRequest" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "responseCode" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "auditEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkIdempotencyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductivitySnapshot" (
    "id" SERIAL NOT NULL,
    "referenceDate" TIMESTAMP(3) NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "tasksOverdue" INTEGER NOT NULL DEFAULT 0,
    "attendancesHandled" INTEGER NOT NULL DEFAULT 0,
    "slaBreaches" INTEGER NOT NULL DEFAULT 0,
    "avgResolutionHours" DOUBLE PRECISION,
    "reassignments" INTEGER NOT NULL DEFAULT 0,
    "metrics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductivitySnapshot_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Atendimento"
ADD COLUMN "responsibleUserId" INTEGER,
ADD COLUMN "teamId" INTEGER,
ADD COLUMN "portfolioId" INTEGER,
ADD COLUMN "slaPolicyCode" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN "slaTargetAt" TIMESTAMP(3),
ADD COLUMN "slaBreachedAt" TIMESTAMP(3),
ADD COLUMN "convertedTaskId" INTEGER,
ADD COLUMN "convertedDeadlineId" INTEGER;

-- AlterTable
ALTER TABLE "Task"
ADD COLUMN "ownerUserId" INTEGER,
ADD COLUMN "teamId" INTEGER,
ADD COLUMN "portfolioId" INTEGER,
ADD COLUMN "workflowStage" TEXT NOT NULL DEFAULT 'captura',
ADD COLUMN "slaTargetAt" TIMESTAMP(3),
ADD COLUMN "followupState" TEXT NOT NULL DEFAULT 'idle',
ADD COLUMN "lastFollowupAt" TIMESTAMP(3),
ADD COLUMN "breachedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");
CREATE UNIQUE INDEX "Portfolio_code_key" ON "Portfolio"("code");
CREATE UNIQUE INDEX "Portfolio_teamId_name_key" ON "Portfolio"("teamId", "name");
CREATE UNIQUE INDEX "PortfolioMember_portfolioId_userId_key" ON "PortfolioMember"("portfolioId", "userId");
CREATE UNIQUE INDEX "TaskLink_taskId_entityType_entityId_key" ON "TaskLink"("taskId", "entityType", "entityId");
CREATE UNIQUE INDEX "TaskFollowupSchedule_dedupeKey_key" ON "TaskFollowupSchedule"("dedupeKey");
CREATE UNIQUE INDEX "WorkIdempotencyRequest_work_scope_key" ON "WorkIdempotencyRequest"("scope", "key");
CREATE UNIQUE INDEX "ProductivitySnapshot_productivity_snapshot_scope_key" ON "ProductivitySnapshot"("referenceDate", "scopeType", "scopeId");

-- CreateIndex
CREATE INDEX "TaskFollowupSchedule_state_followupAt_idx" ON "TaskFollowupSchedule"("state", "followupAt");
CREATE INDEX "TaskHistory_taskId_occurredAt_idx" ON "TaskHistory"("taskId", "occurredAt");
CREATE INDEX "AttendanceHistory_attendanceId_occurredAt_idx" ON "AttendanceHistory"("attendanceId", "occurredAt");
CREATE INDEX "WorkAuditEvent_scope_occurredAt_idx" ON "WorkAuditEvent"("scope", "occurredAt");
CREATE INDEX "WorkAuditEvent_entityType_entityId_idx" ON "WorkAuditEvent"("entityType", "entityId");
CREATE INDEX "Task_ownerUserId_idx" ON "Task"("ownerUserId");
CREATE INDEX "Task_teamId_idx" ON "Task"("teamId");
CREATE INDEX "Task_portfolioId_idx" ON "Task"("portfolioId");
CREATE INDEX "Atendimento_responsibleUserId_idx" ON "Atendimento"("responsibleUserId");
CREATE INDEX "Atendimento_teamId_idx" ON "Atendimento"("teamId");
CREATE INDEX "Atendimento_portfolioId_idx" ON "Atendimento"("portfolioId");

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_primaryOwnerUserId_fkey" FOREIGN KEY ("primaryOwnerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_backupOwnerUserId_fkey" FOREIGN KEY ("backupOwnerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PortfolioMember" ADD CONSTRAINT "PortfolioMember_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PortfolioMember" ADD CONSTRAINT "PortfolioMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Atendimento" ADD CONSTRAINT "Atendimento_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Atendimento" ADD CONSTRAINT "Atendimento_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Atendimento" ADD CONSTRAINT "Atendimento_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskLink" ADD CONSTRAINT "TaskLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskFollowupSchedule" ADD CONSTRAINT "TaskFollowupSchedule_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskHistory" ADD CONSTRAINT "TaskHistory_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceHistory" ADD CONSTRAINT "AttendanceHistory_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Atendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill best-effort ownership from email local-part.
UPDATE "Task" t
SET "ownerUserId" = u."id"
FROM "User" u
WHERE t."ownerUserId" IS NULL
  AND lower(split_part(u."email", '@', 1)) = lower(t."owner");

UPDATE "Atendimento" a
SET "responsibleUserId" = u."id"
FROM "User" u
WHERE a."responsibleUserId" IS NULL
  AND a."responsible" IS NOT NULL
  AND lower(split_part(u."email", '@', 1)) = lower(a."responsible");

UPDATE "Atendimento" a
SET "responsibleUserId" = u."id"
FROM "User" u
WHERE a."responsibleUserId" IS NULL
  AND lower(u."email") = lower(a."actorEmail");
