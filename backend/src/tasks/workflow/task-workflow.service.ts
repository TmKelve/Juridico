import { TaskAuditService } from '../core/task-audit';
import { TaskDomainError } from '../core/task-errors';
import { createTaskHistoryEntry, type TaskRepository } from '../core/task-repository';
import { applyOverdueStatus, assertTaskTransition, resolveTaskStatusFromWorkflow } from '../core/task-status';
import type {
  TaskActor,
  TaskAggregate,
  TaskAuditEvent,
  TaskEntityLink,
  TaskOrigin,
  TaskPriority,
  TaskRecord,
  TaskStatusInput,
  TaskWorkflowStage,
} from '../core/task-types';
import { toLegacyTaskStatus } from '../integrations/task-frontend-status.adapter';

function normalizeDateOnly(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new TaskDomainError('dueDate inválida', 400, 'TASK_INVALID', { dueDate: value });
  }
  return parsed.toISOString().slice(0, 10);
}

function normalizeText(value: string | null | undefined) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeLinks(links: TaskEntityLink[]) {
  const deduped = new Map<string, TaskEntityLink>();
  for (const link of links) {
    const key = `${link.entityType}:${link.entityId}`;
    deduped.set(key, { entityType: link.entityType, entityId: Math.trunc(link.entityId) });
  }
  return [...deduped.values()];
}

function resolveWorkflowStageForStatus(status: TaskRecord['status'], currentStage: TaskWorkflowStage): TaskWorkflowStage {
  switch (status) {
    case 'backlog':
      return 'captura';
    case 'triagem':
      return 'planejamento';
    case 'em_execucao':
    case 'atrasada':
      return 'execucao';
    case 'aguardando_cliente':
    case 'aguardando_interno':
      return 'aguardando';
    case 'concluida':
    case 'cancelada':
      return 'conclusao';
    default:
      return currentStage;
  }
}

function buildAggregate(task: TaskRecord): TaskAggregate {
  return {
    ...task,
    legacyStatus: toLegacyTaskStatus(task.status),
    breached: task.status === 'atrasada',
    linkedEntities: task.linkedEntities.map((link) => ({ ...link })),
    history: task.history.map((entry) => ({ ...entry, diff: { ...entry.diff } })),
  };
}

export class TaskWorkflowService {
  constructor(
    private readonly dependencies: {
      repository: TaskRepository;
      auditService: TaskAuditService;
      now?: () => Date;
    },
  ) {}

  async createTask(input: {
    title: string;
    description?: string | null;
    processId?: number | null;
    clientId?: number | null;
    origin: TaskOrigin;
    ownerUserId?: number | null;
    ownerLabel?: string | null;
    portfolioId?: number | null;
    teamId?: number | null;
    priority: TaskPriority;
    dueDate?: string | null;
    workflowStage: TaskWorkflowStage;
    linkedEntities?: TaskEntityLink[];
    notes?: string | null;
    createdByUserId?: number | null;
    idempotencyKey?: string | null;
  }, actor: TaskActor) {
    const now = this.dependencies.now?.() ?? new Date();
    const title = normalizeText(input.title);
    if (!title) {
      throw new TaskDomainError('Título da tarefa é obrigatório', 400, 'TASK_INVALID');
    }

    const dueDate = normalizeDateOnly(input.dueDate);
    const links = normalizeLinks(input.linkedEntities ?? []);
    await this.dependencies.repository.assertRelations({
      processIds: input.processId ? [input.processId] : [],
      clientIds: input.clientId ? [input.clientId] : [],
      ownerUserIds: input.ownerUserId ? [input.ownerUserId] : [],
      links,
    });

    const result = await this.dependencies.auditService.runIdempotent({
      key: input.idempotencyKey,
      scope: 'task.create',
      entityType: 'task',
      entityId: input.processId ?? input.clientId ?? null,
      action: 'task.create',
      payload: { ...input, title, dueDate, linkedEntities: links },
      onConflictMessage: 'Chave de idempotência já utilizada em outra criação de tarefa',
      execute: async () => {
        const createdAt = now.toISOString();
        const status = resolveTaskStatusFromWorkflow(input.workflowStage, dueDate, now);
        const historyEntry = createTaskHistoryEntry('task.create', actor, { toStatus: status, links }, now);
        const created = await this.dependencies.repository.create({
          title,
          description: normalizeText(input.description),
          status,
          priority: input.priority,
          dueDate,
          slaDueAt: null,
          ownerUserId: input.ownerUserId ?? null,
          ownerLabel: normalizeText(input.ownerLabel) || actor.label,
          portfolioId: input.portfolioId ?? null,
          teamId: input.teamId ?? null,
          linkedEntities: links,
          workflowStage: input.workflowStage,
          followupState: 'idle',
          createdByUserId: input.createdByUserId ?? actor.userId ?? null,
          createdAt,
          updatedAt: createdAt,
          origin: input.origin,
          processId: input.processId ?? null,
          clientId: input.clientId ?? null,
          notes: typeof input.notes === 'string' ? input.notes.trim() : null,
          history: [historyEntry],
        });
        return buildAggregate(created);
      },
    });

    const auditEvent = await this.dependencies.auditService.record({
      action: 'task_created',
      status: 'success',
      entityType: 'task',
      entityId: result.data.taskId,
      actor: actor.label,
      idempotencyKey: input.idempotencyKey,
      context: { origin: input.origin, workflowStage: input.workflowStage },
      diff: { status: result.data.status, linkedEntities: result.data.linkedEntities },
      occurredAt: now,
    });

    return {
      task: result.data,
      auditEvent,
      idempotency: result.mode,
    };
  }

  async updateStatus(input: {
    taskId: number;
    fromStatus?: TaskStatusInput;
    toStatus: TaskStatusInput;
    transitionReason?: string | null;
    actorUserId?: number | null;
    idempotencyKey?: string | null;
  }, actor: TaskActor) {
    const now = this.dependencies.now?.() ?? new Date();
    const current = await this.dependencies.repository.findById(input.taskId);
    if (!current) {
      throw new TaskDomainError('Tarefa não encontrada', 404, 'TASK_NOT_FOUND', { taskId: input.taskId });
    }

    const expectedFrom = input.fromStatus ?? current.status;
    const { current: currentStatus, next } = assertTaskTransition(expectedFrom, input.toStatus);
    if (currentStatus !== current.status && !(current.status === 'atrasada' && currentStatus === 'backlog')) {
      throw new TaskDomainError('Status atual diverge do esperado', 409, 'TASK_TRANSITION_INVALID', {
        expected: currentStatus,
        actual: current.status,
      });
    }

    const result = await this.dependencies.auditService.runIdempotent({
      key: input.idempotencyKey,
      scope: 'task.updateStatus',
      entityType: 'task',
      entityId: input.taskId,
      action: 'task.updateStatus',
      payload: input,
      execute: async () => {
        const status = applyOverdueStatus(next, current.dueDate, now);
        const updated = await this.dependencies.repository.update(input.taskId, {
          status,
          workflowStage: resolveWorkflowStageForStatus(status, current.workflowStage),
          updatedAt: now.toISOString(),
        });
        const withHistory = await this.dependencies.repository.appendHistory(input.taskId, createTaskHistoryEntry('task.updateStatus', actor, {
          fromStatus: current.status,
          toStatus: status,
          transitionReason: input.transitionReason ?? null,
          actorUserId: input.actorUserId ?? actor.userId ?? null,
        }, now));
        return buildAggregate(withHistory);
      },
    });

    const auditEvent = await this.dependencies.auditService.record({
      action: 'task_status_updated',
      status: 'success',
      entityType: 'task',
      entityId: input.taskId,
      actor: actor.label,
      idempotencyKey: input.idempotencyKey,
      context: { transitionReason: input.transitionReason ?? null },
      diff: { fromStatus: current.status, toStatus: result.data.status },
      occurredAt: now,
    });

    return { task: result.data, auditEvent };
  }

  async linkEntities(input: {
    taskId: number;
    links: TaskEntityLink[];
    actorUserId?: number | null;
    idempotencyKey?: string | null;
  }, actor: TaskActor) {
    const now = this.dependencies.now?.() ?? new Date();
    const current = await this.dependencies.repository.findById(input.taskId);
    if (!current) {
      throw new TaskDomainError('Tarefa não encontrada', 404, 'TASK_NOT_FOUND', { taskId: input.taskId });
    }

    const normalizedLinks = normalizeLinks(input.links);
    await this.dependencies.repository.assertRelations({ links: normalizedLinks });
    const existingKeys = new Set(current.linkedEntities.map((link) => `${link.entityType}:${link.entityId}`));
    const duplicates = normalizedLinks.filter((link) => existingKeys.has(`${link.entityType}:${link.entityId}`));
    if (duplicates.length > 0) {
      throw new TaskDomainError('Vínculo duplicado para a tarefa', 409, 'TASK_LINK_DUPLICATE', { duplicates });
    }

    const result = await this.dependencies.auditService.runIdempotent({
      key: input.idempotencyKey,
      scope: 'task.linkEntities',
      entityType: 'task_link',
      entityId: input.taskId,
      action: 'task.linkEntities',
      payload: { taskId: input.taskId, links: normalizedLinks },
      execute: async () => {
        const updated = await this.dependencies.repository.update(input.taskId, {
          linkedEntities: [...current.linkedEntities, ...normalizedLinks],
          updatedAt: now.toISOString(),
        });
        const withHistory = await this.dependencies.repository.appendHistory(input.taskId, createTaskHistoryEntry('task.linkEntities', actor, {
          linksAdded: normalizedLinks,
          actorUserId: input.actorUserId ?? actor.userId ?? null,
        }, now));
        return buildAggregate(withHistory);
      },
    });

    const auditEvent = await this.dependencies.auditService.record({
      action: 'task_entities_linked',
      status: 'success',
      entityType: 'task_link',
      entityId: input.taskId,
      actor: actor.label,
      idempotencyKey: input.idempotencyKey,
      context: { taskId: input.taskId },
      diff: { linksAdded: normalizedLinks },
      occurredAt: now,
    });

    return { task: result.data, auditEvent };
  }
}
