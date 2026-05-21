import { createHash } from 'crypto';
import { FinanceDomainError } from './errors';
import type {
  FinanceActor,
  FinanceAuditEntityType,
  FinanceAuditEventPayload,
  FinanceAuditStatus,
} from './types';

export interface FinanceAuditEventInput {
  scope: string;
  entityType: FinanceAuditEntityType;
  entityId: string | number | null;
  action: string;
  status: FinanceAuditStatus;
  summary: string;
  details?: Record<string, unknown>;
  actor: FinanceActor;
  occurredAt?: Date | string;
  correlationId?: string | null;
  idempotencyKey?: string | null;
}

export interface FinanceAuditQuery {
  scope?: string;
  entityType?: FinanceAuditEntityType;
  entityId?: string;
  action?: string;
  status?: FinanceAuditStatus;
  correlationId?: string;
  idempotencyKey?: string;
  limit?: number;
}

export interface FinanceIdempotencyRecord {
  key: string;
  scope: string;
  entityType: FinanceAuditEntityType;
  entityId: string | null;
  action: string;
  payloadHash: string;
  responseCode: number;
  responseBody: unknown;
  auditEventId?: string | null;
  createdAt: string;
}

export interface FinanceAuditRepository {
  createEvent(event: FinanceAuditEventPayload): Promise<FinanceAuditEventPayload>;
  listEvents(query?: FinanceAuditQuery): Promise<FinanceAuditEventPayload[]>;
  findIdempotencyRecord(scope: string, key: string): Promise<FinanceIdempotencyRecord | null>;
  saveIdempotencyRecord(record: FinanceIdempotencyRecord): Promise<FinanceIdempotencyRecord>;
}

export interface FinanceIdempotentResult<T> {
  mode: 'created' | 'replayed';
  data: T;
  idempotencyKey: string | null;
}

function buildStableHash(value: unknown): string {
  const normalize = (input: unknown): string => {
    if (input === null || input === undefined) return 'null';
    if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
      return JSON.stringify(input);
    }
    if (input instanceof Date) return JSON.stringify(input.toISOString());
    if (Array.isArray(input)) return `[${input.map(normalize).join(',')}]`;
    if (typeof input === 'object') {
      const entries = Object.entries(input as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right));
      return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${normalize(entryValue)}`).join(',')}}`;
    }
    return JSON.stringify(String(input));
  };

  return createHash('sha256').update(normalize(value)).digest('hex');
}

export class FinanceAuditService {
  constructor(private readonly repository: FinanceAuditRepository) {}

  async record(input: FinanceAuditEventInput) {
    const event = this.normalizeEvent(input);
    return this.repository.createEvent(event);
  }

  async list(query: FinanceAuditQuery = {}) {
    return this.repository.listEvents(query);
  }

  async runIdempotent<T>(input: {
    key?: string | null;
    scope: string;
    entityType: FinanceAuditEntityType;
    entityId: string | number | null;
    action: string;
    payload: unknown;
    responseCode?: number;
    execute: () => Promise<T>;
    onConflictMessage?: string;
  }): Promise<FinanceIdempotentResult<T>> {
    const key = normalizeIdempotencyKey(input.key);
    if (!key) {
      return { mode: 'created', data: await input.execute(), idempotencyKey: null };
    }

    const entityId = input.entityId === null || input.entityId === undefined ? null : String(input.entityId);
    const payloadHash = buildStableHash(input.payload);
    const existing = await this.repository.findIdempotencyRecord(input.scope, key);

    if (existing) {
      if (
        existing.entityType !== input.entityType
        || existing.entityId !== entityId
        || existing.action !== input.action
        || existing.payloadHash !== payloadHash
      ) {
        throw new FinanceDomainError(
          input.onConflictMessage ?? 'idempotencyKey reutilizado com outro payload',
          409,
          'IDEMPOTENCY_CONFLICT',
          { scope: input.scope, key },
        );
      }

      return { mode: 'replayed', data: existing.responseBody as T, idempotencyKey: key };
    }

    const data = await input.execute();
    await this.repository.saveIdempotencyRecord({
      key,
      scope: input.scope,
      entityType: input.entityType,
      entityId,
      action: input.action,
      payloadHash,
      responseCode: input.responseCode ?? 200,
      responseBody: data,
      createdAt: new Date().toISOString(),
    });
    return { mode: 'created', data, idempotencyKey: key };
  }

  private normalizeEvent(input: FinanceAuditEventInput): FinanceAuditEventPayload {
    if (!input.scope.trim()) {
      throw new FinanceDomainError('Scope de auditoria é obrigatório', 400, 'FIN_AUDIT_INVALID');
    }

    return {
      id: `fin_audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      scope: input.scope.trim(),
      entityType: input.entityType,
      entityId: input.entityId === null || input.entityId === undefined ? null : String(input.entityId),
      action: input.action.trim(),
      status: input.status,
      summary: input.summary.trim(),
      details: input.details ?? {},
      actor: input.actor,
      occurredAt: new Date(input.occurredAt ?? new Date()).toISOString(),
      correlationId: input.correlationId ?? null,
      idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey),
      createdAt: new Date().toISOString(),
    };
  }
}

export class InMemoryFinanceAuditRepository implements FinanceAuditRepository {
  private readonly events = new Map<string, FinanceAuditEventPayload>();
  private readonly idempotency = new Map<string, FinanceIdempotencyRecord>();

  async createEvent(event: FinanceAuditEventPayload) {
    this.events.set(event.id, event);
    return event;
  }

  async listEvents(query: FinanceAuditQuery = {}) {
    const items = [...this.events.values()].filter((event) => {
      if (query.scope !== undefined && event.scope !== query.scope) return false;
      if (query.entityType !== undefined && event.entityType !== query.entityType) return false;
      if (query.entityId !== undefined && event.entityId !== query.entityId) return false;
      if (query.action !== undefined && event.action !== query.action) return false;
      if (query.status !== undefined && event.status !== query.status) return false;
      if (query.correlationId !== undefined && event.correlationId !== query.correlationId) return false;
      if (query.idempotencyKey !== undefined && event.idempotencyKey !== query.idempotencyKey) return false;
      return true;
    });

    items.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
    return typeof query.limit === 'number' ? items.slice(0, query.limit) : items;
  }

  async findIdempotencyRecord(scope: string, key: string) {
    return this.idempotency.get(`${scope}:${key}`) ?? null;
  }

  async saveIdempotencyRecord(record: FinanceIdempotencyRecord) {
    this.idempotency.set(`${record.scope}:${record.key}`, record);
    return record;
  }
}

export class PrismaFinanceAuditRepository implements FinanceAuditRepository {
  constructor(private readonly prisma: any) {}

  async createEvent(event: FinanceAuditEventPayload) {
    return this.prisma.financeAuditEvent.create({
      data: {
        ...event,
        occurredAt: new Date(event.occurredAt),
      },
    });
  }

  async listEvents(query: FinanceAuditQuery = {}) {
    return this.prisma.financeAuditEvent.findMany({
      where: {
        ...(query.scope ? { scope: query.scope } : {}),
        ...(query.entityType ? { entityType: query.entityType } : {}),
        ...(query.entityId ? { entityId: query.entityId } : {}),
        ...(query.action ? { action: query.action } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.correlationId ? { correlationId: query.correlationId } : {}),
        ...(query.idempotencyKey ? { idempotencyKey: query.idempotencyKey } : {}),
      },
      orderBy: { occurredAt: 'desc' },
      take: query.limit,
    });
  }

  async findIdempotencyRecord(scope: string, key: string) {
    return this.prisma.financeIdempotencyRequest.findUnique({
      where: { finance_scope_key: { scope, key } },
    });
  }

  async saveIdempotencyRecord(record: FinanceIdempotencyRecord) {
    return this.prisma.financeIdempotencyRequest.create({ data: record });
  }
}

export function normalizeIdempotencyKey(value: string | null | undefined) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}
