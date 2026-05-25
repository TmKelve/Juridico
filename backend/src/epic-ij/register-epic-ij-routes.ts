import type express from 'express';
import { buildTaskPayload } from '../tasks.contract';
import { type AttendanceAggregate, buildLegacyAttendancePayload } from '../attendances/core/attendance.model';
import { createAttendance } from '../attendances/core/attendance.create';
import { updateAttendanceSla } from '../attendances/sla/attendance-sla';
import { convertAttendanceToDeadline, convertAttendanceToTask } from '../attendances/conversion/attendance-conversion';
import { TaskWorkflowService } from '../tasks/workflow/task-workflow.service';
import { InMemoryTaskFollowupDispatcher } from '../notifications/tasks/task-followup-dispatcher';
import { TaskFollowupService } from '../tasks/followup/task-followup.service';
import { TaskFollowupJob } from '../jobs/tasks/task-followup.job';
import { TaskAuditService, type TaskAuditRepository, type TaskAuditQuery, type TaskIdempotencyRecord } from '../tasks/core/task-audit';
import { type TaskRelationAssertions, type TaskRepository } from '../tasks/core/task-repository';
import { normalizeTaskStatus, toLegacyTaskStatus } from '../tasks/integrations/task-frontend-status.adapter';
import type { TaskAuditEvent, TaskEntityLink, TaskHistoryEntry, TaskRecord } from '../tasks/core/task-types';
import { ensureAuthorized, AuthzForbiddenError } from '../authz/guards/authz.guard';
import { ManagementAuditService, type ManagementAuditEventRecord, type ManagementAuditIdempotencyRecord, type ManagementAuditQuery, type ManagementAuditRepository } from '../audit/team';
import { TeamOwnershipService, type PortfolioOwnershipRecord, type TeamOwnershipRepository, type TeamRecord, type TeamUserRecord } from '../team';
import { PortfolioReassignmentService, type AttendanceOwnershipRecord, type PortfolioOwnershipRepository, type TaskOwnershipRecord } from '../ownership';
import { ProductivitySnapshotService, type ProductivityAttendanceRecord, type ProductivityAuditReference, type ProductivitySnapshotRepository, type ProductivityTaskRecord } from '../productivity';

type UserToken = { sub: number; role: string; email: string };

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalText(value: unknown) {
  const normalized = normalizeText(value);
  return normalized || null;
}

async function loadActorContext(prisma: any, decoded: UserToken) {
  const [teamMemberships, portfolioMemberships] = await Promise.all([
    prisma.teamMember.findMany({ where: { userId: decoded.sub, isActive: true }, select: { teamId: true } }).catch(() => []),
    prisma.portfolioMember.findMany({ where: { userId: decoded.sub, isActive: true }, select: { portfolioId: true } }).catch(() => []),
  ]);

  return {
    userId: decoded.sub,
    role: decoded.role,
    teamIds: teamMemberships.map((item: any) => item.teamId),
    portfolioIds: portfolioMemberships.map((item: any) => item.portfolioId),
  };
}

function mapTaskRow(row: any): TaskRecord {
  return {
    taskId: row.id,
    title: row.title,
    description: row.description,
    status: normalizeTaskStatus(row.status),
    priority: row.priority,
    dueDate: row.dueDate ? new Date(row.dueDate).toISOString().slice(0, 10) : null,
    slaDueAt: row.slaTargetAt ? new Date(row.slaTargetAt).toISOString() : null,
    ownerUserId: row.ownerUserId ?? null,
    ownerLabel: row.owner ?? row.ownerUser?.email?.split('@')[0] ?? 'sem-responsavel',
    portfolioId: row.portfolioId ?? null,
    teamId: row.teamId ?? null,
    linkedEntities: (row.links ?? []).map((link: any) => ({ entityType: link.entityType, entityId: link.entityId })),
    workflowStage: row.workflowStage ?? 'captura',
    followupState: row.followupState ?? 'idle',
    createdByUserId: null,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    origin: row.origin,
    processId: row.processId ?? null,
    clientId: row.clientId ?? null,
    notes: row.notes ?? null,
    history: (row.history ?? []).map((item: any) => ({
      at: new Date(item.occurredAt).toISOString(),
      action: item.eventType,
      actor: item.actor,
      diff: typeof item.details === 'object' && item.details ? item.details : {},
    })),
  };
}

function toLegacyAttendanceStatus(status: string) {
  switch (status) {
    case 'triagem':
    case 'em_atendimento':
      return 'aberto';
    case 'fechado_fora_sla':
      return 'resolvido';
    case 'cancelado':
      return 'sem_resposta';
    default:
      return status;
  }
}

function mapAttendanceRow(row: any): AttendanceAggregate {
  const status = row.status;
  return {
    attendanceId: row.id,
    processId: row.processId ?? null,
    clientId: row.clientId ?? null,
    status,
    priority: row.priority === 'critical' ? 'critica' : row.priority,
    channel: row.channel,
    type: row.type,
    subject: row.subject,
    summary: row.summary,
    notes: row.notes ?? null,
    ownerUserId: row.responsibleUserId ?? null,
    portfolioId: row.portfolioId ?? null,
    teamId: row.teamId ?? null,
    slaPolicyCode: row.slaPolicyCode ?? 'default',
    slaTargetAt: row.slaTargetAt ? new Date(row.slaTargetAt).toISOString() : null,
    slaBreached: Boolean(row.slaBreachedAt),
    conversionState: row.processId ? 'elegivel_prazo' : 'elegivel_tarefa',
    derivedTaskId: row.convertedTaskId ?? null,
    derivedDeadlineId: row.convertedDeadlineId ?? null,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    occurredAt: new Date(row.occurredAt).toISOString(),
    nextStep: row.nextStep ?? null,
    scheduledReturnAt: row.scheduledReturnAt ? new Date(row.scheduledReturnAt).toISOString() : null,
    critical: Boolean(row.critical),
    critico: Boolean(row.critical),
    operationalState:
      status === 'triagem' ? 'em_triagem'
      : status === 'em_atendimento' ? 'em_atendimento'
      : status === 'aguardando_cliente' ? 'pendente_cliente'
      : status === 'fechado_fora_sla' ? 'encerrado_fora_sla'
      : status === 'cancelado' ? 'cancelado'
      : status === 'resolvido' ? 'resolvido'
      : 'novo',
  };
}

function buildAttendanceResponse(row: any) {
  const aggregate = mapAttendanceRow(row);
  const payload = buildLegacyAttendancePayload(aggregate, {
    processTitle: row.process?.title ?? '',
    clientName: row.clientRecord?.name ?? row.process?.clientRecord?.name ?? row.process?.client ?? 'Cliente nao informado',
    ownerLabel: row.responsible ?? row.responsibleUser?.email?.split('@')[0] ?? row.actorEmail?.split('@')[0] ?? 'sem-responsavel',
  });

  return {
    ...payload,
    status: toLegacyAttendanceStatus(payload.status),
    operationalStatus: aggregate.status,
  };
}

class PrismaTaskAuditRepository implements TaskAuditRepository {
  constructor(private readonly prisma: any) {}

  async createEvent(event: TaskAuditEvent) {
    await this.prisma.workAuditEvent.create({
      data: {
        id: event.id,
        scope: event.scope,
        entityType: event.entityType,
        entityId: event.entityId === null ? null : String(event.entityId),
        action: event.action,
        status: event.status,
        summary: event.action,
        details: event.context,
        actor: { actor: event.actor },
        occurredAt: new Date(event.occurredAt),
        correlationId: event.correlationId,
        idempotencyKey: event.idempotencyKey,
      },
    });
    return event;
  }

  async listEvents(query: TaskAuditQuery = {}) {
    const rows = await this.prisma.workAuditEvent.findMany({
      where: {
        scope: 'task',
        action: query.action,
        entityType: query.entityType,
        entityId: query.entityId === undefined ? undefined : query.entityId === null ? null : String(query.entityId),
        idempotencyKey: query.idempotencyKey,
      },
      orderBy: { occurredAt: 'desc' },
    });
    return rows.map((row: any) => ({
      id: row.id,
      scope: 'task',
      action: row.action,
      status: row.status,
      entityType: row.entityType,
      entityId: row.entityId,
      actor: row.actor?.actor ?? 'system',
      occurredAt: new Date(row.occurredAt).toISOString(),
      context: row.details ?? {},
      diff: null,
      idempotencyKey: row.idempotencyKey,
      correlationId: row.correlationId,
    }));
  }

  async findIdempotencyRecord(scope: string, key: string) {
    const row = await this.prisma.workIdempotencyRequest.findFirst({ where: { scope, key } });
    if (!row) return null;
    return {
      key: row.key,
      scope: row.scope,
      entityType: row.entityType,
      entityId: row.entityId,
      action: row.action,
      payloadHash: row.payloadHash,
      responseBody: row.responseBody,
      createdAt: new Date(row.createdAt).toISOString(),
    };
  }

  async saveIdempotencyRecord(record: TaskIdempotencyRecord) {
    await this.prisma.workIdempotencyRequest.create({
      data: {
        key: record.key,
        scope: record.scope,
        entityType: record.entityType,
        entityId: record.entityId,
        action: record.action,
        payloadHash: record.payloadHash,
        responseCode: 200,
        responseBody: record.responseBody,
      },
    });
    return record;
  }
}

class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly prisma: any) {}

  async create(input: Omit<TaskRecord, 'taskId'>) {
    const created = await this.prisma.task.create({
      data: {
        title: input.title,
        description: input.description,
        processId: input.processId,
        clientId: input.clientId,
        origin: input.origin,
        dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : new Date(),
        status: toLegacyTaskStatus(input.status),
        priority: input.priority,
        owner: input.ownerLabel,
        ownerUserId: input.ownerUserId,
        createdBy: input.ownerLabel,
        notes: input.notes,
        linkedToDeadline: input.linkedEntities.some((item) => item.entityType === 'deadline'),
        linkedToPublication: input.linkedEntities.some((item) => item.entityType === 'publication'),
        linkedToDocument: input.linkedEntities.some((item) => item.entityType === 'document'),
        immediateAction: input.priority === 'critica',
        workflowStage: input.workflowStage,
        followupState: input.followupState,
        teamId: input.teamId,
        portfolioId: input.portfolioId,
        slaTargetAt: input.slaDueAt ? new Date(input.slaDueAt) : null,
        links: input.linkedEntities.length ? { createMany: { data: input.linkedEntities } } : undefined,
        history: input.history.length ? {
          createMany: {
            data: input.history.map((entry) => ({
              eventType: entry.action,
              actor: entry.actor,
              details: entry.diff,
              occurredAt: new Date(entry.at),
            })),
          },
        } : undefined,
      },
      include: { links: true, history: true, ownerUser: true },
    });
    return mapTaskRow(created);
  }

  async findById(taskId: number) {
    const row = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { links: true, history: { orderBy: { occurredAt: 'asc' } }, ownerUser: true },
    });
    return row ? mapTaskRow(row) : null;
  }

  async update(taskId: number, data: Partial<TaskRecord>) {
    const row = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate ? new Date(`${data.dueDate}T00:00:00.000Z`) : undefined,
        status: data.status ? toLegacyTaskStatus(data.status as any) : undefined,
        priority: data.priority,
        owner: data.ownerLabel,
        ownerUserId: data.ownerUserId,
        notes: data.notes,
        workflowStage: data.workflowStage,
        followupState: data.followupState,
        teamId: data.teamId,
        portfolioId: data.portfolioId,
        slaTargetAt: data.slaDueAt ? new Date(data.slaDueAt) : undefined,
        lastFollowupAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
      },
      include: { links: true, history: { orderBy: { occurredAt: 'asc' } }, ownerUser: true },
    });
    if (Array.isArray(data.linkedEntities)) {
      await this.prisma.taskLink.deleteMany({ where: { taskId } });
      if (data.linkedEntities.length) {
        await this.prisma.taskLink.createMany({ data: data.linkedEntities.map((link) => ({ taskId, ...link })) });
      }
    }
    const refreshed = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { links: true, history: { orderBy: { occurredAt: 'asc' } }, ownerUser: true },
    });
    return mapTaskRow(refreshed);
  }

  async appendHistory(taskId: number, entry: TaskHistoryEntry) {
    await this.prisma.taskHistory.create({
      data: {
        taskId,
        eventType: entry.action,
        actor: entry.actor,
        details: entry.diff,
        occurredAt: new Date(entry.at),
      },
    });
    const refreshed = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { links: true, history: { orderBy: { occurredAt: 'asc' } }, ownerUser: true },
    });
    return mapTaskRow(refreshed);
  }

  async assertRelations(input: TaskRelationAssertions) {
    for (const processId of input.processIds ?? []) {
      const count = await this.prisma.process.count({ where: { id: processId } });
      if (!count) throw new Error('TASK_PROCESS_NOT_FOUND');
    }
    for (const clientId of input.clientIds ?? []) {
      const count = await this.prisma.client.count({ where: { id: clientId } });
      if (!count) throw new Error('TASK_CLIENT_NOT_FOUND');
    }
    for (const ownerUserId of input.ownerUserIds ?? []) {
      const count = await this.prisma.user.count({ where: { id: ownerUserId } });
      if (!count) throw new Error('TASK_OWNER_NOT_FOUND');
    }
    for (const link of input.links ?? []) {
      const map: Record<string, string> = {
        process: 'process',
        deadline: 'prazo',
        publication: 'publication',
        attendance: 'atendimento',
        document: 'documento',
      };
      const delegate = map[link.entityType];
      if (!delegate) continue;
      const count = await this.prisma[delegate].count({ where: { id: link.entityId } });
      if (!count) throw new Error('TASK_LINK_TARGET_NOT_FOUND');
    }
  }
}

class PrismaTaskFollowupRepository {
  constructor(private readonly prisma: any) {}

  async createSchedule(input: any) {
    const row = await this.prisma.taskFollowupSchedule.create({ data: input });
    return { followupId: row.id, ...input };
  }

  async findScheduleByDedupeKey(scope: string, dedupeKey: string) {
    const row = await this.prisma.taskFollowupSchedule.findUnique({ where: { dedupeKey } });
    if (!row) return null;
    return {
      followupId: row.id,
      taskId: row.taskId,
      followupAt: new Date(row.followupAt).toISOString(),
      reason: row.reason,
      channel: row.channel,
      actor: 'system',
      dedupeKey: row.dedupeKey,
      status: row.state === 'dispatched' ? 'dispatched' : row.state === 'acknowledged' ? 'dispatched' : row.state === 'scheduled' ? 'scheduled' : 'skipped',
      createdAt: new Date(row.createdAt).toISOString(),
      dispatchedAt: row.dispatchedAt ? new Date(row.dispatchedAt).toISOString() : null,
    };
  }

  async listPending(referenceAt: string, limit: number) {
    const rows = await this.prisma.taskFollowupSchedule.findMany({
      where: { state: { in: ['scheduled', 'pending_dispatch'] }, followupAt: { lte: new Date(referenceAt) } },
      orderBy: { followupAt: 'asc' },
      take: limit,
    });
    return rows.map((row: any) => ({
      followupId: row.id,
      taskId: row.taskId,
      followupAt: new Date(row.followupAt).toISOString(),
      reason: row.reason,
      channel: row.channel,
      actor: 'system',
      dedupeKey: row.dedupeKey,
      status: row.state === 'scheduled' ? 'scheduled' : row.state,
      createdAt: new Date(row.createdAt).toISOString(),
      dispatchedAt: row.dispatchedAt ? new Date(row.dispatchedAt).toISOString() : null,
    }));
  }

  async updateSchedule(followupId: number, data: any) {
    const row = await this.prisma.taskFollowupSchedule.update({
      where: { id: followupId },
      data: {
        state: data.status === 'dispatched' ? 'dispatched' : data.status === 'skipped' ? 'acknowledged' : undefined,
        dispatchedAt: data.dispatchedAt ? new Date(data.dispatchedAt) : undefined,
      },
    });
    return {
      followupId: row.id,
      taskId: row.taskId,
      followupAt: new Date(row.followupAt).toISOString(),
      reason: row.reason,
      channel: row.channel,
      actor: 'system',
      dedupeKey: row.dedupeKey,
      status: row.state,
      createdAt: new Date(row.createdAt).toISOString(),
      dispatchedAt: row.dispatchedAt ? new Date(row.dispatchedAt).toISOString() : null,
    };
  }
}

class PrismaManagementAuditRepository implements ManagementAuditRepository {
  constructor(private readonly prisma: any) {}

  async createEvent(event: ManagementAuditEventRecord) {
    await this.prisma.workAuditEvent.create({
      data: {
        id: event.id,
        scope: event.scope,
        entityType: event.entityType,
        entityId: event.entityId,
        action: event.action,
        status: event.status,
        summary: event.action,
        details: event.context,
        actor: { actor: event.actor },
        occurredAt: new Date(event.occurredAt),
        correlationId: event.correlationId,
        idempotencyKey: event.idempotencyKey,
      },
    });
    return event;
  }

  async listEvents(query: ManagementAuditQuery = {}) {
    const rows = await this.prisma.workAuditEvent.findMany({
      where: {
        scope: query.scope,
        action: query.action,
        status: query.status,
        entityType: query.entityType,
        entityId: query.entityId,
        idempotencyKey: query.idempotencyKey,
        correlationId: query.correlationId,
      },
      orderBy: { occurredAt: 'desc' },
      take: query.limit,
    });
    return rows.map((row: any) => ({
      id: row.id,
      scope: row.scope,
      action: row.action,
      status: row.status,
      entityType: row.entityType,
      entityId: row.entityId,
      actor: row.actor?.actor ?? 'system',
      occurredAt: new Date(row.occurredAt).toISOString(),
      context: row.details ?? {},
      diff: null,
      idempotencyKey: row.idempotencyKey,
      correlationId: row.correlationId,
      createdAt: new Date(row.createdAt).toISOString(),
    }));
  }

  async findIdempotencyRecord(scope: string, key: string) {
    const row = await this.prisma.workIdempotencyRequest.findFirst({ where: { scope, key } });
    if (!row) return null;
    return {
      key: row.key,
      scope: row.scope,
      entityType: row.entityType,
      entityId: row.entityId,
      action: row.action,
      payloadHash: row.payloadHash,
      responseCode: row.responseCode,
      responseBody: row.responseBody,
      createdAt: new Date(row.createdAt).toISOString(),
    };
  }

  async saveIdempotencyRecord(record: ManagementAuditIdempotencyRecord) {
    await this.prisma.workIdempotencyRequest.create({ data: record });
    return record;
  }
}

class PrismaTeamOwnershipRepository implements TeamOwnershipRepository, PortfolioOwnershipRepository, ProductivitySnapshotRepository {
  constructor(private readonly prisma: any) {}

  async findTeamById(teamId: number): Promise<TeamRecord | null> {
    const row = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { memberships: { where: { isActive: true }, select: { userId: true } } },
    });
    if (!row) return null;
    return { id: row.id, name: row.name, active: row.active, memberUserIds: row.memberships.map((item: any) => item.userId) };
  }

  async findUserById(userId: number): Promise<TeamUserRecord | null> {
    const row = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    return row ? { id: row.id } : null;
  }

  async findPortfolioById(portfolioId: number): Promise<PortfolioOwnershipRecord | null> {
    const row = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: { memberships: { where: { isActive: true }, select: { userId: true } } },
    });
    if (!row) return null;
    return {
      portfolioId: row.id,
      name: row.name,
      teamId: row.teamId,
      primaryOwnerUserId: row.primaryOwnerUserId,
      backupOwnerUserId: row.backupOwnerUserId,
      memberUserIds: row.memberships.map((item: any) => item.userId),
      active: row.active,
    };
  }

  async savePortfolio(portfolio: PortfolioOwnershipRecord) {
    await this.prisma.portfolio.update({
      where: { id: portfolio.portfolioId },
      data: {
        teamId: portfolio.teamId,
        primaryOwnerUserId: portfolio.primaryOwnerUserId,
        backupOwnerUserId: portfolio.backupOwnerUserId,
      },
    });
    await this.prisma.portfolioMember.deleteMany({ where: { portfolioId: portfolio.portfolioId } });
    if (portfolio.memberUserIds.length) {
      await this.prisma.portfolioMember.createMany({
        data: portfolio.memberUserIds.map((userId) => ({
          portfolioId: portfolio.portfolioId,
          userId,
          role: 'member',
          isBackup: portfolio.backupOwnerUserId === userId,
          isActive: true,
        })),
      });
    }
    return this.findPortfolioById(portfolio.portfolioId) as any;
  }

  async listTasksByPortfolioId(portfolioId: number): Promise<TaskOwnershipRecord[]> {
    const rows = await this.prisma.task.findMany({ where: { portfolioId }, select: { id: true, status: true, ownerUserId: true, portfolioId: true, teamId: true, updatedAt: true } });
    return rows.map((row: any) => ({ taskId: row.id, status: normalizeTaskStatus(row.status), ownerUserId: row.ownerUserId, portfolioId: row.portfolioId, teamId: row.teamId, updatedAt: new Date(row.updatedAt).toISOString() }));
  }

  async saveTask(task: TaskOwnershipRecord) {
    const row = await this.prisma.task.update({ where: { id: task.taskId }, data: { ownerUserId: task.ownerUserId, updatedAt: new Date(task.updatedAt) } });
    return { taskId: row.id, status: normalizeTaskStatus(row.status), ownerUserId: row.ownerUserId, portfolioId: row.portfolioId, teamId: row.teamId, updatedAt: new Date(row.updatedAt).toISOString() };
  }

  async listAttendancesByPortfolioId(portfolioId: number): Promise<AttendanceOwnershipRecord[]> {
    const rows = await this.prisma.atendimento.findMany({ where: { portfolioId }, select: { id: true, status: true, responsibleUserId: true, portfolioId: true, teamId: true, updatedAt: true } });
    return rows.map((row: any) => ({ attendanceId: row.id, status: row.status, ownerUserId: row.responsibleUserId, portfolioId: row.portfolioId, teamId: row.teamId, updatedAt: new Date(row.updatedAt).toISOString() }));
  }

  async saveAttendance(attendance: AttendanceOwnershipRecord) {
    const row = await this.prisma.atendimento.update({ where: { id: attendance.attendanceId }, data: { responsibleUserId: attendance.ownerUserId, updatedAt: new Date(attendance.updatedAt) } });
    return { attendanceId: row.id, status: row.status, ownerUserId: row.responsibleUserId, portfolioId: row.portfolioId, teamId: row.teamId, updatedAt: new Date(row.updatedAt).toISOString() };
  }

  async listTasks(): Promise<ProductivityTaskRecord[]> {
    const rows = await this.prisma.task.findMany({ select: { id: true, status: true, ownerUserId: true, portfolioId: true, teamId: true, dueDate: true, createdAt: true, updatedAt: true } });
    return rows.map((row: any) => ({
      taskId: row.id,
      status: normalizeTaskStatus(row.status),
      ownerUserId: row.ownerUserId,
      portfolioId: row.portfolioId,
      teamId: row.teamId,
      dueDate: row.dueDate ? new Date(row.dueDate).toISOString().slice(0, 10) : null,
      completedAt: normalizeTaskStatus(row.status) === 'concluida' ? new Date(row.updatedAt).toISOString() : null,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    }));
  }

  async listAttendances(): Promise<ProductivityAttendanceRecord[]> {
    const rows = await this.prisma.atendimento.findMany({ select: { id: true, status: true, responsibleUserId: true, portfolioId: true, teamId: true, slaTargetAt: true, createdAt: true, updatedAt: true } });
    return rows.map((row: any) => ({
      attendanceId: row.id,
      status: row.status,
      ownerUserId: row.responsibleUserId,
      portfolioId: row.portfolioId,
      teamId: row.teamId,
      slaTargetAt: row.slaTargetAt ? new Date(row.slaTargetAt).toISOString() : null,
      resolvedAt: ['resolvido', 'fechado_fora_sla'].includes(row.status) ? new Date(row.updatedAt).toISOString() : null,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    }));
  }

  async listReassignmentEvents(): Promise<ProductivityAuditReference[]> {
    const rows = await this.prisma.workAuditEvent.findMany({ where: { action: 'team.reassignPortfolio' }, orderBy: { occurredAt: 'desc' } });
    return rows.map((row: any) => ({ scope: row.scope, action: row.action, entityId: row.entityId, occurredAt: new Date(row.occurredAt).toISOString() }));
  }
}

async function authorizeTaskMutation(prisma: any, decoded: UserToken, permissionKey: 'task.view' | 'task.update' | 'task.linkEntities' | 'task.followup.schedule', task: any) {
  const actor = await loadActorContext(prisma, decoded);
  ensureAuthorized({
    actor,
    permissionKey,
    resourceType: 'task',
    resourceId: task.id,
    context: {
      ownerUserId: task.ownerUserId ?? task.process?.ownerId ?? null,
      teamId: task.teamId ?? null,
      portfolioId: task.portfolioId ?? null,
      allowedScopes: ['own', 'team', 'portfolio', 'global'],
    },
  });
}

async function authorizeAttendanceMutation(prisma: any, decoded: UserToken, permissionKey: 'attendance.view' | 'attendance.updateSla' | 'attendance.convertToTask' | 'attendance.convertToDeadline' | 'attendance.closeOutOfSla', attendance: any) {
  const actor = await loadActorContext(prisma, decoded);
  ensureAuthorized({
    actor,
    permissionKey,
    resourceType: 'attendance',
    resourceId: attendance.id,
    context: {
      ownerUserId: attendance.responsibleUserId ?? attendance.process?.ownerId ?? null,
      teamId: attendance.teamId ?? null,
      portfolioId: attendance.portfolioId ?? null,
      allowedScopes: ['own', 'team', 'portfolio', 'global'],
    },
  });
}

export function registerEpicIjRoutes(input: {
  app: express.Express;
  prisma: any;
  getUserFromReq: (req: express.Request) => UserToken | null;
}) {
  const taskAuditService = new TaskAuditService(new PrismaTaskAuditRepository(input.prisma));
  const taskRepository = new PrismaTaskRepository(input.prisma);
  const taskWorkflowService = new TaskWorkflowService({ repository: taskRepository, auditService: taskAuditService });
  const taskFollowupService = new TaskFollowupService({
    repository: taskRepository,
    followups: new PrismaTaskFollowupRepository(input.prisma) as any,
    dispatcher: new InMemoryTaskFollowupDispatcher(),
    auditService: taskAuditService,
  });
  const taskFollowupJob = new TaskFollowupJob(taskFollowupService);
  const managementAuditService = new ManagementAuditService(new PrismaManagementAuditRepository(input.prisma));
  const teamRepository = new PrismaTeamOwnershipRepository(input.prisma);

  input.app.post('/tasks/:id/status', async (req, res) => {
    const decoded = input.getUserFromReq(req);
    if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
    const task = await input.prisma.task.findUnique({ where: { id: Number(req.params.id) }, include: { process: true } });
    if (!task) return res.status(404).send({ message: 'Tarefa nao encontrada' });
    try {
      await authorizeTaskMutation(input.prisma, decoded, 'task.update', task);
      const result = await taskWorkflowService.updateStatus({
        taskId: task.id,
        fromStatus: req.body.fromStatus,
        toStatus: req.body.toStatus,
        transitionReason: req.body.transitionReason ?? null,
        actorUserId: decoded.sub,
        idempotencyKey: req.body.idempotencyKey ?? null,
      }, { type: 'user', userId: decoded.sub, label: decoded.email.split('@')[0] });
      const refreshed = await input.prisma.task.findUnique({ where: { id: task.id }, include: { process: { include: { owner: true, clientRecord: true } }, clientRecord: true } });
      return res.json({ task: buildTaskPayload(refreshed), workflow: result.task, auditEvent: result.auditEvent });
    } catch (error: any) {
      if (error instanceof AuthzForbiddenError) return res.status(403).json({ message: 'Acesso negado', decision: error.decision });
      return res.status(error?.statusCode ?? 500).json({ message: error?.message ?? 'Falha ao atualizar tarefa' });
    }
  });

  input.app.post('/tasks/:id/links', async (req, res) => {
    const decoded = input.getUserFromReq(req);
    if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
    const task = await input.prisma.task.findUnique({ where: { id: Number(req.params.id) }, include: { process: true } });
    if (!task) return res.status(404).send({ message: 'Tarefa nao encontrada' });
    try {
      await authorizeTaskMutation(input.prisma, decoded, 'task.linkEntities', task);
      const result = await taskWorkflowService.linkEntities({
        taskId: task.id,
        links: Array.isArray(req.body.links) ? req.body.links : [],
        actorUserId: decoded.sub,
        idempotencyKey: req.body.idempotencyKey ?? null,
      }, { type: 'user', userId: decoded.sub, label: decoded.email.split('@')[0] });
      res.json(result);
    } catch (error: any) {
      if (error instanceof AuthzForbiddenError) return res.status(403).json({ message: 'Acesso negado', decision: error.decision });
      res.status(error?.statusCode ?? 500).json({ message: error?.message ?? 'Falha ao vincular entidades' });
    }
  });

  input.app.post('/tasks/:id/followups', async (req, res) => {
    const decoded = input.getUserFromReq(req);
    if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
    const task = await input.prisma.task.findUnique({ where: { id: Number(req.params.id) }, include: { process: true } });
    if (!task) return res.status(404).send({ message: 'Tarefa nao encontrada' });
    try {
      await authorizeTaskMutation(input.prisma, decoded, 'task.followup.schedule', task);
      const result = await taskFollowupService.schedule({
        taskId: task.id,
        followupAt: req.body.followupAt,
        reason: req.body.reason ?? 'manual',
        channel: req.body.channel ?? 'in_app',
        actor: `user:${decoded.sub}`,
        dedupeKey: req.body.dedupeKey ?? `${task.id}:${req.body.followupAt}:${req.body.reason ?? 'manual'}`,
      });
      res.status(201).json(result);
    } catch (error: any) {
      if (error instanceof AuthzForbiddenError) return res.status(403).json({ message: 'Acesso negado', decision: error.decision });
      res.status(error?.statusCode ?? 500).json({ message: error?.message ?? 'Falha ao agendar follow-up' });
    }
  });

  input.app.post('/tasks/followups/execute', async (req, res) => {
    const decoded = input.getUserFromReq(req);
    if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
    try {
      const actor = await loadActorContext(input.prisma, decoded);
      ensureAuthorized({
        actor,
        permissionKey: 'task.followup.schedule',
        resourceType: 'task',
        context: { allowedScopes: ['global'] },
      });
      const result = await taskFollowupJob.run({
        referenceAt: req.body.referenceAt,
        batchSize: req.body.batchSize,
        dedupeKey: req.body.dedupeKey ?? `manual:${new Date().toISOString()}`,
        actor: 'system',
      });
      res.json(result);
    } catch (error: any) {
      if (error instanceof AuthzForbiddenError) return res.status(403).json({ message: 'Acesso negado', decision: error.decision });
      res.status(500).json({ message: error?.message ?? 'Falha ao executar follow-ups' });
    }
  });

  input.app.get('/tasks/:id/audit', async (req, res) => {
    const decoded = input.getUserFromReq(req);
    if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
    const task = await input.prisma.task.findUnique({ where: { id: Number(req.params.id) }, include: { process: true } });
    if (!task) return res.status(404).send({ message: 'Tarefa nao encontrada' });
    try {
      await authorizeTaskMutation(input.prisma, decoded, 'task.view', task);
      const events = await taskAuditService.list({ entityId: task.id });
      res.json(events);
    } catch (error: any) {
      if (error instanceof AuthzForbiddenError) return res.status(403).json({ message: 'Acesso negado', decision: error.decision });
      res.status(500).json({ message: error?.message ?? 'Falha ao consultar auditoria' });
    }
  });

  input.app.post('/attendances/:id/update-sla', async (req, res) => {
    const decoded = input.getUserFromReq(req);
    if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
    const row = await input.prisma.atendimento.findUnique({ where: { id: Number(req.params.id) }, include: { process: true, clientRecord: true } });
    if (!row) return res.status(404).send({ message: 'Atendimento nao encontrado' });
    try {
      await authorizeAttendanceMutation(input.prisma, decoded, req.body.allowCloseOutOfSla ? 'attendance.closeOutOfSla' : 'attendance.updateSla', row);
      const result = updateAttendanceSla({
        attendance: mapAttendanceRow(row),
        status: req.body.status,
        slaTargetAt: req.body.slaTargetAt ?? null,
        allowCloseOutOfSla: Boolean(req.body.allowCloseOutOfSla),
        justification: req.body.justification ?? null,
        actorUserId: decoded.sub,
        idempotencyKey: req.body.idempotencyKey ?? null,
        now: new Date(),
      });
      const updated = await input.prisma.atendimento.update({
        where: { id: row.id },
        data: {
          status: result.attendance.status,
          slaTargetAt: result.attendance.slaTargetAt ? new Date(result.attendance.slaTargetAt) : null,
          slaBreachedAt: result.attendance.slaBreached ? new Date() : null,
        },
        include: { process: true, clientRecord: true },
      });
      await managementAuditService.record({
        scope: 'attendance',
        action: result.auditEvent.action,
        status: result.auditEvent.status,
        entityType: 'attendance',
        entityId: row.id,
        actor: `user:${decoded.sub}`,
        occurredAt: result.auditEvent.occurredAt,
        context: result.auditEvent.context,
        diff: result.auditEvent.diff,
        idempotencyKey: result.auditEvent.idempotencyKey,
      });
      res.json({ attendance: buildAttendanceResponse(updated), auditEvent: result.auditEvent });
    } catch (error: any) {
      if (error instanceof AuthzForbiddenError) return res.status(403).json({ message: 'Acesso negado', decision: error.decision });
      res.status(500).json({ message: error?.message ?? 'Falha ao atualizar SLA' });
    }
  });

  input.app.post('/attendances/:id/convert-task', async (req, res) => {
    const decoded = input.getUserFromReq(req);
    if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
    const row = await input.prisma.atendimento.findUnique({ where: { id: Number(req.params.id) }, include: { process: true, clientRecord: true } });
    if (!row) return res.status(404).send({ message: 'Atendimento nao encontrado' });
    try {
      await authorizeAttendanceMutation(input.prisma, decoded, 'attendance.convertToTask', row);
      const taskCount = await input.prisma.task.count();
      const converted = convertAttendanceToTask({
        attendance: mapAttendanceRow(row),
        taskId: taskCount + 1,
        title: req.body.title ?? row.subject,
        dueDate: req.body.dueDate ?? null,
        priority: req.body.priority ?? row.priority,
        ownerUserId: req.body.ownerUserId ?? row.responsibleUserId ?? null,
        actorUserId: decoded.sub,
        idempotencyKey: req.body.idempotencyKey ?? null,
        now: new Date(),
      });
      const taskResult = await taskWorkflowService.createTask({
        ...converted.taskPayload,
        ownerLabel: row.responsible ?? decoded.email.split('@')[0],
        createdByUserId: decoded.sub,
        origin: 'atendimento',
      }, { type: 'user', userId: decoded.sub, label: decoded.email.split('@')[0] });
      const updated = await input.prisma.atendimento.update({
        where: { id: row.id },
        data: { convertedTaskId: taskResult.task.taskId },
        include: { process: true, clientRecord: true },
      });
      await managementAuditService.record({
        scope: 'attendance',
        action: converted.auditEvent.action,
        status: converted.auditEvent.status,
        entityType: 'attendance',
        entityId: row.id,
        actor: `user:${decoded.sub}`,
        occurredAt: converted.auditEvent.occurredAt,
        context: converted.auditEvent.context,
        diff: converted.auditEvent.diff,
        idempotencyKey: converted.auditEvent.idempotencyKey,
      });
      const createdTask = await input.prisma.task.findUnique({ where: { id: taskResult.task.taskId }, include: { process: { include: { owner: true, clientRecord: true } }, clientRecord: true } });
      res.status(201).json({ attendance: buildAttendanceResponse(updated), task: buildTaskPayload(createdTask), auditEvent: converted.auditEvent });
    } catch (error: any) {
      if (error instanceof AuthzForbiddenError) return res.status(403).json({ message: 'Acesso negado', decision: error.decision });
      res.status(500).json({ message: error?.message ?? 'Falha ao converter atendimento em tarefa' });
    }
  });

  input.app.post('/attendances/:id/convert-deadline', async (req, res) => {
    const decoded = input.getUserFromReq(req);
    if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
    const row = await input.prisma.atendimento.findUnique({ where: { id: Number(req.params.id) }, include: { process: true, clientRecord: true } });
    if (!row) return res.status(404).send({ message: 'Atendimento nao encontrado' });
    try {
      await authorizeAttendanceMutation(input.prisma, decoded, 'attendance.convertToDeadline', row);
      const deadlineCount = await input.prisma.prazo.count();
      const converted = convertAttendanceToDeadline({
        attendance: mapAttendanceRow(row),
        deadlineId: deadlineCount + 1,
        title: req.body.title ?? row.subject,
        dueDate: req.body.dueDate,
        priority: req.body.priority ?? row.priority,
        responsible: req.body.responsible ?? row.responsible ?? null,
        actorUserId: decoded.sub,
        idempotencyKey: req.body.idempotencyKey ?? null,
        now: new Date(),
      });
      const created = await input.prisma.prazo.create({
        data: {
          processId: converted.deadlinePayload.processId,
          title: converted.deadlinePayload.title,
          dueDate: new Date(`${converted.deadlinePayload.dueDate}T00:00:00.000Z`),
          status: 'aberto',
          priority: converted.deadlinePayload.priority,
          origin: 'atendimento',
          responsible: converted.deadlinePayload.responsible,
          notes: converted.deadlinePayload.notes,
          createdBy: decoded.email.split('@')[0],
        },
        include: { process: { include: { owner: true, clientRecord: true } }, clientRecord: true },
      });
      const updated = await input.prisma.atendimento.update({
        where: { id: row.id },
        data: { convertedDeadlineId: created.id },
        include: { process: true, clientRecord: true },
      });
      await managementAuditService.record({
        scope: 'attendance',
        action: converted.auditEvent.action,
        status: converted.auditEvent.status,
        entityType: 'attendance',
        entityId: row.id,
        actor: `user:${decoded.sub}`,
        occurredAt: converted.auditEvent.occurredAt,
        context: converted.auditEvent.context,
        diff: converted.auditEvent.diff,
        idempotencyKey: converted.auditEvent.idempotencyKey,
      });
      res.status(201).json({ attendance: buildAttendanceResponse(updated), deadline: created, auditEvent: converted.auditEvent });
    } catch (error: any) {
      if (error instanceof AuthzForbiddenError) return res.status(403).json({ message: 'Acesso negado', decision: error.decision });
      res.status(500).json({ message: error?.message ?? 'Falha ao converter atendimento em prazo' });
    }
  });

  input.app.get('/attendances/:id/audit', async (req, res) => {
    const decoded = input.getUserFromReq(req);
    if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
    const row = await input.prisma.atendimento.findUnique({ where: { id: Number(req.params.id) }, include: { process: true } });
    if (!row) return res.status(404).send({ message: 'Atendimento nao encontrado' });
    try {
      await authorizeAttendanceMutation(input.prisma, decoded, 'attendance.view', row);
      const events = await managementAuditService.list({ scope: 'attendance', entityId: String(row.id) });
      res.json(events);
    } catch (error: any) {
      if (error instanceof AuthzForbiddenError) return res.status(403).json({ message: 'Acesso negado', decision: error.decision });
      res.status(500).json({ message: error?.message ?? 'Falha ao consultar auditoria' });
    }
  });

  input.app.post('/team/ownership', async (req, res) => {
    const decoded = input.getUserFromReq(req);
    if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
    try {
      const service = new TeamOwnershipService({
        repository: teamRepository,
        auditService: managementAuditService,
        authorizer: {
          assertAllowed: async (params) => {
            const actor = await loadActorContext(input.prisma, decoded);
            ensureAuthorized({
              actor,
              permissionKey: params.permissionKey,
              resourceType: 'team',
              resourceId: params.portfolioId,
              context: { teamId: params.teamId, portfolioId: params.portfolioId, allowedScopes: ['team', 'portfolio', 'global'] },
            });
          },
        },
      });
      const result = await service.assignOwnership({ ...req.body, actorUserId: decoded.sub });
      res.status(201).json(result);
    } catch (error: any) {
      if (error instanceof AuthzForbiddenError) return res.status(403).json({ message: 'Acesso negado', decision: error.decision });
      res.status(error?.statusCode ?? 500).json({ message: error?.message ?? 'Falha ao atribuir ownership' });
    }
  });

  input.app.post('/team/portfolio-reassign', async (req, res) => {
    const decoded = input.getUserFromReq(req);
    if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
    try {
      const service = new PortfolioReassignmentService({
        repository: teamRepository,
        auditService: managementAuditService,
        authorizer: {
          assertAllowed: async (params) => {
            const actor = await loadActorContext(input.prisma, decoded);
            ensureAuthorized({
              actor,
              permissionKey: params.permissionKey,
              resourceType: 'team',
              resourceId: params.portfolioId,
              context: { portfolioId: params.portfolioId, allowedScopes: ['portfolio', 'global'] },
            });
          },
        },
      });
      const result = await service.reassignPortfolio({ ...req.body, actorUserId: decoded.sub });
      res.json(result);
    } catch (error: any) {
      if (error instanceof AuthzForbiddenError) return res.status(403).json({ message: 'Acesso negado', decision: error.decision });
      res.status(error?.statusCode ?? 500).json({ message: error?.message ?? 'Falha ao redistribuir carteira' });
    }
  });

  input.app.get('/productivity/snapshot', async (req, res) => {
    const decoded = input.getUserFromReq(req);
    if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
    try {
      const service = new ProductivitySnapshotService({
        repository: teamRepository,
        auditService: managementAuditService,
        authorizer: {
          assertAllowed: async (params) => {
            const actor = await loadActorContext(input.prisma, decoded);
            ensureAuthorized({
              actor,
              permissionKey: params.permissionKey,
              resourceType: 'productivity',
              resourceId: String(params.scopeId),
              context: {
                ownerUserId: params.scopeType === 'user' ? Number(params.scopeId) : null,
                teamId: params.scopeType === 'team' ? Number(params.scopeId) : null,
                portfolioId: params.scopeType === 'portfolio' ? Number(params.scopeId) : null,
                allowedScopes: ['own', 'team', 'portfolio', 'global'],
              },
            });
          },
        },
      });
      const result = await service.snapshot({
        referenceDate: typeof req.query.referenceDate === 'string' ? req.query.referenceDate : new Date().toISOString().slice(0, 10),
        scopeType: typeof req.query.scopeType === 'string' ? req.query.scopeType as any : 'user',
        scopeId: typeof req.query.scopeId === 'string' ? Number(req.query.scopeId) : decoded.sub,
        includeClosedTasks: req.query.includeClosedTasks === 'true',
        includeAttendances: req.query.includeAttendances !== 'false',
        actorUserId: decoded.sub,
        idempotencyKey: typeof req.query.idempotencyKey === 'string' ? req.query.idempotencyKey : null,
      });
      res.json(result);
    } catch (error: any) {
      if (error instanceof AuthzForbiddenError) return res.status(403).json({ message: 'Acesso negado', decision: error.decision });
      res.status(error?.statusCode ?? 500).json({ message: error?.message ?? 'Falha ao gerar snapshot de produtividade' });
    }
  });

  input.app.post('/management/audit/event', async (req, res) => {
    const decoded = input.getUserFromReq(req);
    if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
    try {
      const actor = await loadActorContext(input.prisma, decoded);
      ensureAuthorized({
        actor,
        permissionKey: 'team.assignOwnership',
        resourceType: 'team',
        context: { allowedScopes: ['global'] },
      });
      const event = await managementAuditService.record({ ...req.body, actor: `user:${decoded.sub}` });
      res.status(201).json({ event });
    } catch (error: any) {
      if (error instanceof AuthzForbiddenError) return res.status(403).json({ message: 'Acesso negado', decision: error.decision });
      res.status(error?.statusCode ?? 500).json({ message: error?.message ?? 'Falha ao registrar auditoria' });
    }
  });

  input.app.get('/management/audit', async (req, res) => {
    const decoded = input.getUserFromReq(req);
    if (!decoded) return res.status(401).send({ message: 'Token nao fornecido ou invalido' });
    const actor = await loadActorContext(input.prisma, decoded);
    try {
      ensureAuthorized({
        actor,
        permissionKey: 'team.view',
        resourceType: 'team',
        context: { allowedScopes: ['team', 'portfolio', 'global'] },
      });
      const items = await managementAuditService.list({
        scope: typeof req.query.scope === 'string' ? req.query.scope as any : undefined,
        entityId: typeof req.query.entityId === 'string' ? req.query.entityId : undefined,
        limit: typeof req.query.limit === 'string' ? Number(req.query.limit) : 100,
      });
      res.json(items);
    } catch (error: any) {
      if (error instanceof AuthzForbiddenError) return res.status(403).json({ message: 'Acesso negado', decision: error.decision });
      res.status(error?.statusCode ?? 500).json({ message: error?.message ?? 'Falha ao consultar auditoria de gestao' });
    }
  });
}
