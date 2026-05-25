import { TaskAuditService } from '../core/task-audit';
import { TaskDomainError } from '../core/task-errors';
import { type TaskRepository } from '../core/task-repository';
import { applyOverdueStatus, isTerminalTaskStatus } from '../core/task-status';
import type { TaskAggregate, TaskAuditEvent, TaskFollowupState, TaskRecord } from '../core/task-types';
import { toLegacyTaskStatus } from '../integrations/task-frontend-status.adapter';
import type { TaskFollowupDispatcher } from '../../notifications/tasks/task-followup-dispatcher';

export interface TaskFollowupScheduleRecord {
  followupId: number;
  taskId: number;
  followupAt: string;
  reason: 'overdue' | 'sla_risk' | 'manual';
  channel: 'in_app' | 'internal_feed';
  actor: string;
  dedupeKey: string;
  status: 'scheduled' | 'dispatched' | 'skipped';
  createdAt: string;
  dispatchedAt: string | null;
}

export interface TaskFollowupRepository {
  createSchedule(input: Omit<TaskFollowupScheduleRecord, 'followupId'>): Promise<TaskFollowupScheduleRecord>;
  findScheduleByDedupeKey(scope: string, dedupeKey: string): Promise<TaskFollowupScheduleRecord | null>;
  listPending(referenceAt: string, limit: number): Promise<TaskFollowupScheduleRecord[]>;
  updateSchedule(followupId: number, data: Partial<TaskFollowupScheduleRecord>): Promise<TaskFollowupScheduleRecord>;
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

export class InMemoryTaskFollowupRepository implements TaskFollowupRepository {
  private nextId = 1;
  private readonly schedules = new Map<number, TaskFollowupScheduleRecord>();
  private readonly scopes = new Map<string, number>();

  async createSchedule(input: Omit<TaskFollowupScheduleRecord, 'followupId'>) {
    const record: TaskFollowupScheduleRecord = { ...input, followupId: this.nextId++ };
    this.schedules.set(record.followupId, { ...record });
    this.scopes.set(`task.followup.schedule:${record.dedupeKey}`, record.followupId);
    return { ...record };
  }

  async findScheduleByDedupeKey(scope: string, dedupeKey: string) {
    const id = this.scopes.get(`${scope}:${dedupeKey}`);
    if (!id) return null;
    const record = this.schedules.get(id);
    return record ? { ...record } : null;
  }

  async listPending(referenceAt: string, limit: number) {
    const items = [...this.schedules.values()]
      .filter((item) => item.status === 'scheduled' && item.followupAt <= referenceAt)
      .sort((left, right) => left.followupAt.localeCompare(right.followupAt))
      .slice(0, limit);
    return items.map((item) => ({ ...item }));
  }

  async updateSchedule(followupId: number, data: Partial<TaskFollowupScheduleRecord>) {
    const current = this.schedules.get(followupId);
    if (!current) {
      throw new TaskDomainError('Follow-up da tarefa não encontrado', 404, 'TASK_FOLLOWUP_INVALID', { followupId });
    }
    const updated = { ...current, ...data };
    this.schedules.set(followupId, updated);
    return { ...updated };
  }
}

export class TaskFollowupService {
  constructor(
    private readonly dependencies: {
      repository: TaskRepository;
      followups: TaskFollowupRepository;
      dispatcher: TaskFollowupDispatcher;
      auditService: TaskAuditService;
      now?: () => Date;
    },
  ) {}

  async schedule(input: {
    taskId: number;
    followupAt: string;
    reason: 'overdue' | 'sla_risk' | 'manual';
    channel: 'in_app' | 'internal_feed';
    actor: string;
    dedupeKey: string;
  }) {
    const task = await this.dependencies.repository.findById(input.taskId);
    if (!task) {
      throw new TaskDomainError('Tarefa não encontrada', 404, 'TASK_NOT_FOUND', { taskId: input.taskId });
    }

    if (isTerminalTaskStatus(task.status)) {
      throw new TaskDomainError('Tarefa não elegível para follow-up', 409, 'TASK_FOLLOWUP_INVALID', { taskId: input.taskId, status: task.status });
    }

    const followupAt = new Date(input.followupAt);
    if (Number.isNaN(followupAt.getTime())) {
      throw new TaskDomainError('Data de follow-up inválida', 400, 'TASK_FOLLOWUP_INVALID', { followupAt: input.followupAt });
    }

    const existing = await this.dependencies.followups.findScheduleByDedupeKey('task.followup.schedule', input.dedupeKey);
    if (existing) {
      if (
        existing.taskId !== input.taskId
        || existing.reason !== input.reason
        || existing.channel !== input.channel
        || existing.followupAt !== followupAt.toISOString()
      ) {
        throw new TaskDomainError('Follow-up duplicado com payload divergente', 409, 'TASK_FOLLOWUP_DUPLICATE', { dedupeKey: input.dedupeKey });
      }

      return {
        task: buildAggregate(task),
        scheduled: true,
        auditEvent: await this.dependencies.auditService.record({
          action: 'task_followup_schedule_replayed',
          status: 'warning',
          entityType: 'task_followup',
          entityId: task.taskId,
          actor: input.actor,
          idempotencyKey: input.dedupeKey,
          context: { followupId: existing.followupId },
          diff: null,
        }),
      };
    }

    const referenceNow = this.dependencies.now?.() ?? new Date();
    const nextState: TaskFollowupState = followupAt.getTime() <= referenceNow.getTime() ? 'pending_dispatch' : 'scheduled';
    const updatedTask = await this.dependencies.repository.update(task.taskId, {
      followupState: nextState,
      status: applyOverdueStatus(task.status, task.dueDate, referenceNow),
      updatedAt: referenceNow.toISOString(),
    });

    await this.dependencies.followups.createSchedule({
      taskId: task.taskId,
      followupAt: followupAt.toISOString(),
      reason: input.reason,
      channel: input.channel,
      actor: input.actor,
      dedupeKey: input.dedupeKey,
      status: 'scheduled',
      createdAt: referenceNow.toISOString(),
      dispatchedAt: null,
    });

    const auditEvent = await this.dependencies.auditService.record({
      action: 'task_followup_scheduled',
      status: 'success',
      entityType: 'task_followup',
      entityId: task.taskId,
      actor: input.actor,
      idempotencyKey: input.dedupeKey,
      context: { reason: input.reason, channel: input.channel },
      diff: { fromState: task.followupState, toState: nextState, followupAt: followupAt.toISOString() },
      occurredAt: referenceNow,
    });

    return {
      task: buildAggregate(updatedTask),
      scheduled: true,
      auditEvent,
    };
  }

  async execute(input: {
    referenceAt: string;
    batchSize: number;
    actor: 'scheduler' | 'system';
    dedupeKey: string;
  }) {
    const result = await this.dependencies.auditService.runIdempotent({
      key: input.dedupeKey,
      scope: 'task.followup.execute',
      entityType: 'task_followup',
      entityId: input.dedupeKey,
      action: 'task.followup.execute',
      payload: input,
      onConflictCode: 'TASK_FOLLOWUP_EXECUTION_FAILED',
      onConflictMessage: 'Execução de follow-up já registrada com payload diferente',
      execute: async () => {
        const dueSchedules = await this.dependencies.followups.listPending(new Date(input.referenceAt).toISOString(), input.batchSize);
        let processed = 0;
        let dispatched = 0;
        let skipped = 0;
        const auditEvents: TaskAuditEvent[] = [];

        for (const schedule of dueSchedules) {
          processed += 1;
          const task = await this.dependencies.repository.findById(schedule.taskId);
          if (!task || isTerminalTaskStatus(task.status)) {
            skipped += 1;
            await this.dependencies.followups.updateSchedule(schedule.followupId, { status: 'skipped' });
            auditEvents.push(await this.dependencies.auditService.record({
              action: 'task_followup_skipped',
              status: 'warning',
              entityType: 'task_followup',
              entityId: schedule.taskId,
              actor: input.actor,
              idempotencyKey: schedule.dedupeKey,
              context: { reason: !task ? 'task_missing' : 'task_terminal' },
              diff: null,
            }));
            continue;
          }

          const dispatch = await this.dependencies.dispatcher.dispatch({
            taskId: task.taskId,
            title: task.title,
            dueDate: task.dueDate,
            ownerLabel: task.ownerLabel,
            reason: schedule.reason,
            channel: schedule.channel,
          });

          if (!dispatch.sent) {
            skipped += 1;
            auditEvents.push(await this.dependencies.auditService.record({
              action: 'task_followup_skipped',
              status: 'warning',
              entityType: 'task_followup',
              entityId: task.taskId,
              actor: input.actor,
              idempotencyKey: schedule.dedupeKey,
              context: { reason: dispatch.reason ?? 'dispatch_skipped' },
              diff: null,
            }));
            continue;
          }

          dispatched += 1;
          const now = dispatch.dispatchedAt;
          await this.dependencies.followups.updateSchedule(schedule.followupId, {
            status: 'dispatched',
            dispatchedAt: now,
          });
          await this.dependencies.repository.update(task.taskId, {
            followupState: 'dispatched',
            status: applyOverdueStatus(task.status, task.dueDate, new Date(now)),
            updatedAt: now,
          });
          auditEvents.push(await this.dependencies.auditService.record({
            action: 'task_followup_dispatched',
            status: 'success',
            entityType: 'task_followup',
            entityId: task.taskId,
            actor: input.actor,
            idempotencyKey: schedule.dedupeKey,
            context: { channel: schedule.channel, reason: schedule.reason },
            diff: { notificationId: dispatch.notificationId ?? null },
            occurredAt: now,
          }));
        }

        return { processed, dispatched, skipped, auditEvents };
      },
    });

    return result.data;
  }
}
