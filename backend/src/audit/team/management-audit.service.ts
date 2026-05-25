import { createHash } from 'crypto';
import type {
  ManagementAuditEventInput,
  ManagementAuditEventRecord,
  ManagementAuditIdempotencyRecord,
  ManagementAuditQuery,
  ManagementAuditRepository,
  ManagementIdempotentResult,
} from './management-audit.types';
import { managementAuditScopes, managementAuditStatuses } from './management-audit.types';

export class ManagementAuditError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number = 400,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ManagementAuditError';
  }
}

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableSerialize(entryValue)}`).join(',')}}`;
  }
  return JSON.stringify(String(value));
}

function buildPayloadHash(value: unknown) {
  return createHash('sha256').update(stableSerialize(value)).digest('hex');
}

export function normalizeManagementIdempotencyKey(value: string | null | undefined) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

function normalizeEntityId(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  return String(value);
}

function normalizeOccurredAt(value: string | Date) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ManagementAuditError('AUDIT_INVALID', 'occurredAt inválido.');
  }
  return parsed.toISOString();
}

function normalizeAction(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new ManagementAuditError('AUDIT_INVALID', 'action é obrigatório.');
  }
  return normalized;
}

function assertScope(value: string) {
  if (!managementAuditScopes.includes(value as (typeof managementAuditScopes)[number])) {
    throw new ManagementAuditError('AUDIT_INVALID', 'scope inválido.', 400, { scope: value });
  }
  return value as ManagementAuditEventRecord['scope'];
}

function assertStatus(value: string) {
  if (!managementAuditStatuses.includes(value as (typeof managementAuditStatuses)[number])) {
    throw new ManagementAuditError('AUDIT_INVALID', 'status inválido.', 400, { status: value });
  }
  return value as ManagementAuditEventRecord['status'];
}

function assertActor(value: string) {
  if (value === 'system' || value === 'scheduler') return value;
  if (/^user:\d+$/.test(value)) return value as ManagementAuditEventRecord['actor'];
  throw new ManagementAuditError('AUDIT_INVALID', 'actor inválido.', 400, { actor: value });
}

export class ManagementAuditService {
  constructor(private readonly repository: ManagementAuditRepository) {}

  normalize(input: ManagementAuditEventInput): ManagementAuditEventRecord {
    return {
      id: typeof input.id === 'string' && input.id.trim()
        ? input.id.trim()
        : `mgmt_audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      scope: assertScope(input.scope),
      action: normalizeAction(input.action),
      status: assertStatus(input.status),
      entityType: normalizeAction(input.entityType),
      entityId: normalizeEntityId(input.entityId),
      actor: assertActor(input.actor),
      occurredAt: normalizeOccurredAt(input.occurredAt),
      context: normalizeContext(input.context),
      diff: normalizeDiff(input.diff),
      idempotencyKey: normalizeManagementIdempotencyKey(input.idempotencyKey),
      correlationId: normalizeManagementIdempotencyKey(input.correlationId),
      createdAt: new Date().toISOString(),
    };
  }

  async record(input: ManagementAuditEventInput) {
    return this.repository.createEvent(this.normalize(input));
  }

  async list(query: ManagementAuditQuery = {}) {
    return this.repository.listEvents(query);
  }

  async runIdempotent<T>(input: {
    key?: string | null;
    scope: string;
    entityType: string;
    entityId: string | number | null;
    action: string;
    payload: unknown;
    responseCode?: number;
    execute: () => Promise<T>;
    onConflictMessage?: string;
  }): Promise<ManagementIdempotentResult<T>> {
    const key = normalizeManagementIdempotencyKey(input.key);
    if (!key) {
      return { mode: 'created', data: await input.execute(), idempotencyKey: null };
    }

    const payloadHash = buildPayloadHash(input.payload);
    const entityId = normalizeEntityId(input.entityId);
    const existing = await this.repository.findIdempotencyRecord(input.scope, key);

    if (existing) {
      if (
        existing.entityType !== input.entityType
        || existing.entityId !== entityId
        || existing.action !== input.action
        || existing.payloadHash !== payloadHash
      ) {
        throw new ManagementAuditError(
          'IDEMPOTENCY_CONFLICT',
          input.onConflictMessage ?? 'idempotencyKey reutilizado com outro payload.',
          409,
          { scope: input.scope, key },
        );
      }

      return {
        mode: 'replayed',
        data: existing.responseBody as T,
        idempotencyKey: key,
      };
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

    return {
      mode: 'created',
      data,
      idempotencyKey: key,
    };
  }
}

export class InMemoryManagementAuditRepository implements ManagementAuditRepository {
  private readonly events = new Map<string, ManagementAuditEventRecord>();
  private readonly idempotency = new Map<string, ManagementAuditIdempotencyRecord>();

  async createEvent(event: ManagementAuditEventRecord) {
    this.events.set(event.id, event);
    return event;
  }

  async listEvents(query: ManagementAuditQuery = {}) {
    const items = [...this.events.values()].filter((event) => {
      if (query.scope !== undefined && event.scope !== query.scope) return false;
      if (query.action !== undefined && event.action !== query.action) return false;
      if (query.status !== undefined && event.status !== query.status) return false;
      if (query.entityType !== undefined && event.entityType !== query.entityType) return false;
      if (query.entityId !== undefined && event.entityId !== query.entityId) return false;
      if (query.actor !== undefined && event.actor !== query.actor) return false;
      if (query.idempotencyKey !== undefined && event.idempotencyKey !== query.idempotencyKey) return false;
      if (query.correlationId !== undefined && event.correlationId !== query.correlationId) return false;
      return true;
    });

    items.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
    return typeof query.limit === 'number' ? items.slice(0, query.limit) : items;
  }

  async findIdempotencyRecord(scope: string, key: string) {
    return this.idempotency.get(`${scope}:${key}`) ?? null;
  }

  async saveIdempotencyRecord(record: ManagementAuditIdempotencyRecord) {
    this.idempotency.set(`${record.scope}:${record.key}`, record);
    return record;
  }
}

function normalizeContext(input: Record<string, unknown>) {
  if (!input || Array.isArray(input) || typeof input !== 'object') {
    throw new ManagementAuditError('AUDIT_INVALID', 'context deve ser um objeto.');
  }
  return input;
}

function normalizeDiff(input: Record<string, unknown> | null | undefined) {
  if (input === null || input === undefined) return null;
  if (Array.isArray(input) || typeof input !== 'object') {
    throw new ManagementAuditError('AUDIT_INVALID', 'diff deve ser objeto ou null.');
  }
  return input;
}
