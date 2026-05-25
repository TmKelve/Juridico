import { createHash } from 'crypto';
import { TaskDomainError } from './task-errors';
import type { TaskAuditEntityType, TaskAuditEvent, TaskAuditStatus } from './task-types';

export interface TaskAuditEventInput {
  action: string;
  status: TaskAuditStatus;
  entityType: TaskAuditEntityType;
  entityId: number | string | null;
  actor: string;
  occurredAt?: string | Date;
  context?: Record<string, unknown>;
  diff?: Record<string, unknown> | null;
  idempotencyKey?: string | null;
  correlationId?: string | null;
}

export interface TaskAuditQuery {
  action?: string;
  entityType?: TaskAuditEntityType;
  entityId?: number | string | null;
  idempotencyKey?: string;
}

export interface TaskIdempotencyRecord {
  key: string;
  scope: string;
  entityType: TaskAuditEntityType;
  entityId: string | null;
  action: string;
  payloadHash: string;
  responseBody: unknown;
  createdAt: string;
}

export interface TaskAuditRepository {
  createEvent(event: TaskAuditEvent): Promise<TaskAuditEvent>;
  listEvents(query?: TaskAuditQuery): Promise<TaskAuditEvent[]>;
  findIdempotencyRecord(scope: string, key: string): Promise<TaskIdempotencyRecord | null>;
  saveIdempotencyRecord(record: TaskIdempotencyRecord): Promise<TaskIdempotencyRecord>;
}

function normalizeIdempotencyKey(value: string | null | undefined) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`).join(',')}}`;
  }
  return JSON.stringify(String(value));
}

function payloadHash(value: unknown) {
  return createHash('sha256').update(stableSerialize(value)).digest('hex');
}

export class TaskAuditService {
  constructor(private readonly repository: TaskAuditRepository) {}

  async record(input: TaskAuditEventInput) {
    if (!input.action.trim()) {
      throw new TaskDomainError('Ação de auditoria obrigatória', 400, 'TASK_INVALID');
    }

    return this.repository.createEvent({
      id: `task_audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      scope: 'task',
      action: input.action.trim(),
      status: input.status,
      entityType: input.entityType,
      entityId: input.entityId,
      actor: input.actor,
      occurredAt: new Date(input.occurredAt ?? new Date()).toISOString(),
      context: input.context ?? {},
      diff: input.diff ?? null,
      idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey),
      correlationId: input.correlationId ?? null,
    });
  }

  async list(query: TaskAuditQuery = {}) {
    return this.repository.listEvents(query);
  }

  async runIdempotent<T>(input: {
    key?: string | null;
    scope: string;
    entityType: TaskAuditEntityType;
    entityId: number | string | null;
    action: string;
    payload: unknown;
    execute: () => Promise<T>;
    onConflictCode?: string;
    onConflictMessage?: string;
  }) {
    const key = normalizeIdempotencyKey(input.key);
    if (!key) {
      return { mode: 'created' as const, data: await input.execute() };
    }

    const existing = await this.repository.findIdempotencyRecord(input.scope, key);
    const entityId = input.entityId === null || input.entityId === undefined ? null : String(input.entityId);
    const currentPayloadHash = payloadHash(input.payload);

    if (existing) {
      if (
        existing.entityType !== input.entityType
        || existing.entityId !== entityId
        || existing.action !== input.action
        || existing.payloadHash !== currentPayloadHash
      ) {
        throw new TaskDomainError(
          input.onConflictMessage ?? 'Chave de idempotência reutilizada com payload diferente',
          409,
          input.onConflictCode ?? 'IDEMPOTENCY_CONFLICT',
          { scope: input.scope, key },
        );
      }

      return { mode: 'replayed' as const, data: existing.responseBody as T };
    }

    const data = await input.execute();
    await this.repository.saveIdempotencyRecord({
      key,
      scope: input.scope,
      entityType: input.entityType,
      entityId,
      action: input.action,
      payloadHash: currentPayloadHash,
      responseBody: data,
      createdAt: new Date().toISOString(),
    });
    return { mode: 'created' as const, data };
  }
}

export class InMemoryTaskAuditRepository implements TaskAuditRepository {
  private readonly events = new Map<string, TaskAuditEvent>();
  private readonly idempotency = new Map<string, TaskIdempotencyRecord>();

  async createEvent(event: TaskAuditEvent) {
    this.events.set(event.id, event);
    return event;
  }

  async listEvents(query: TaskAuditQuery = {}) {
    const filtered = [...this.events.values()].filter((event) => {
      if (query.action !== undefined && event.action !== query.action) return false;
      if (query.entityType !== undefined && event.entityType !== query.entityType) return false;
      if (query.entityId !== undefined && event.entityId !== query.entityId) return false;
      if (query.idempotencyKey !== undefined && event.idempotencyKey !== query.idempotencyKey) return false;
      return true;
    });

    filtered.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
    return filtered;
  }

  async findIdempotencyRecord(scope: string, key: string) {
    return this.idempotency.get(`${scope}:${key}`) ?? null;
  }

  async saveIdempotencyRecord(record: TaskIdempotencyRecord) {
    this.idempotency.set(`${record.scope}:${record.key}`, record);
    return record;
  }
}
