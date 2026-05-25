import { TaskDomainError } from './task-errors';
import type { TaskActor, TaskEntityLink, TaskHistoryEntry, TaskRecord } from './task-types';

export interface TaskRelationAssertions {
  processIds?: number[];
  clientIds?: number[];
  ownerUserIds?: number[];
  links?: TaskEntityLink[];
}

export interface TaskRepository {
  create(input: Omit<TaskRecord, 'taskId'>): Promise<TaskRecord>;
  findById(taskId: number): Promise<TaskRecord | null>;
  update(taskId: number, data: Partial<TaskRecord>): Promise<TaskRecord>;
  appendHistory(taskId: number, entry: TaskHistoryEntry): Promise<TaskRecord>;
  assertRelations(input: TaskRelationAssertions): Promise<void>;
}

export class InMemoryTaskRepository implements TaskRepository {
  private nextId = 1;
  private readonly tasks = new Map<number, TaskRecord>();

  constructor(
    private readonly fixtures: {
      processIds?: number[];
      clientIds?: number[];
      ownerUserIds?: number[];
      links?: TaskEntityLink[];
    } = {},
  ) {}

  async create(input: Omit<TaskRecord, 'taskId'>) {
    const task: TaskRecord = { ...input, taskId: this.nextId++ };
    this.tasks.set(task.taskId, cloneTaskRecord(task));
    return cloneTaskRecord(task);
  }

  async findById(taskId: number) {
    const task = this.tasks.get(taskId);
    return task ? cloneTaskRecord(task) : null;
  }

  async update(taskId: number, data: Partial<TaskRecord>) {
    const current = this.tasks.get(taskId);
    if (!current) {
      throw new TaskDomainError('Tarefa não encontrada', 404, 'TASK_NOT_FOUND', { taskId });
    }

    const updated = cloneTaskRecord({ ...current, ...data, taskId: current.taskId });
    this.tasks.set(taskId, updated);
    return cloneTaskRecord(updated);
  }

  async appendHistory(taskId: number, entry: TaskHistoryEntry) {
    const current = await this.findById(taskId);
    if (!current) {
      throw new TaskDomainError('Tarefa não encontrada', 404, 'TASK_NOT_FOUND', { taskId });
    }

    current.history.push({ ...entry, diff: { ...entry.diff } });
    current.updatedAt = entry.at;
    this.tasks.set(taskId, cloneTaskRecord(current));
    return cloneTaskRecord(current);
  }

  async assertRelations(input: TaskRelationAssertions) {
    for (const processId of input.processIds ?? []) {
      if (!this.fixtures.processIds?.includes(processId)) {
        throw new TaskDomainError('Processo vinculado não encontrado', 404, 'TASK_PROCESS_NOT_FOUND', { processId });
      }
    }

    for (const clientId of input.clientIds ?? []) {
      if (!this.fixtures.clientIds?.includes(clientId)) {
        throw new TaskDomainError('Cliente vinculado não encontrado', 404, 'TASK_CLIENT_NOT_FOUND', { clientId });
      }
    }

    for (const ownerUserId of input.ownerUserIds ?? []) {
      if (!this.fixtures.ownerUserIds?.includes(ownerUserId)) {
        throw new TaskDomainError('Responsável da tarefa não encontrado', 404, 'TASK_OWNER_NOT_FOUND', { ownerUserId });
      }
    }

    for (const link of input.links ?? []) {
      const exists = this.fixtures.links?.some((candidate) => candidate.entityType === link.entityType && candidate.entityId === link.entityId);
      if (!exists) {
        throw new TaskDomainError('Entidade vinculada não encontrada', 404, 'TASK_LINK_TARGET_NOT_FOUND', {
          entityType: link.entityType,
          entityId: link.entityId,
        });
      }
    }
  }
}

export function createTaskHistoryEntry(action: string, actor: TaskActor | string, diff: Record<string, unknown>, at = new Date()) {
  return {
    at: at.toISOString(),
    action,
    actor: typeof actor === 'string' ? actor : actor.label,
    diff: { ...diff },
  };
}

function cloneTaskRecord(task: TaskRecord): TaskRecord {
  return {
    ...task,
    linkedEntities: task.linkedEntities.map((link) => ({ ...link })),
    history: task.history.map((entry) => ({ ...entry, diff: { ...entry.diff } })),
  };
}
