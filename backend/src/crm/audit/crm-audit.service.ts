import { createHash } from 'crypto';
import {
  type CrmAuditEntityType,
  type CrmAuditEventInput,
  type CrmAuditQuery,
  type CrmAuditRepository,
  type CrmIdempotentResult,
  type CrmIdempotencyRecord,
} from './crm-audit.types';
import { CrmContractError, normalizeCrmAuditEvent, normalizeIdempotencyKey } from './crm-audit.validators';

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'string') return JSON.stringify(value);
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

export class CrmAuditService {
  constructor(private readonly repository: CrmAuditRepository) {}

  async record(input: CrmAuditEventInput) {
    const normalized = normalizeCrmAuditEvent(input);
    return this.repository.createEvent(normalized);
  }

  async list(query: CrmAuditQuery = {}) {
    return this.repository.listEvents(query);
  }

  async runIdempotent<T>(input: {
    key?: string | null;
    scope: string;
    entityType: CrmAuditEntityType;
    entityId: number | null;
    action: string;
    payload: unknown;
    responseCode?: number;
    execute: () => Promise<T>;
    onConflictMessage?: string;
  }): Promise<CrmIdempotentResult<T>> {
    const key = normalizeIdempotencyKey(input.key);
    if (!key) {
      return {
        mode: 'created',
        data: await input.execute(),
        idempotencyKey: null,
      };
    }

    const existing = await this.repository.findIdempotencyRecord(input.scope, key);
    const payloadHash = buildPayloadHash(input.payload);

    if (existing) {
      this.assertReplayCompatibility(existing, {
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        payloadHash,
        onConflictMessage: input.onConflictMessage,
      });

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
      entityId: input.entityId,
      action: input.action,
      payloadHash,
      responseCode: input.responseCode ?? 201,
      responseBody: data,
      createdAt: new Date().toISOString(),
    });

    return {
      mode: 'created',
      data,
      idempotencyKey: key,
    };
  }

  private assertReplayCompatibility(
    existing: CrmIdempotencyRecord,
    input: {
      entityType: CrmAuditEntityType;
      entityId: number | null;
      action: string;
      payloadHash: string;
      onConflictMessage?: string;
    },
  ) {
    if (existing.entityType !== input.entityType || existing.action !== input.action || existing.entityId !== input.entityId) {
      throw new CrmContractError(
        input.onConflictMessage ?? 'idempotencyKey já foi usado em outra operação',
        409,
        'IDEMPOTENCY_CONFLICT',
        { existingEntityType: existing.entityType, existingAction: existing.action, existingEntityId: existing.entityId },
      );
    }

    if (existing.payloadHash !== input.payloadHash) {
      throw new CrmContractError(
        input.onConflictMessage ?? 'idempotencyKey reutilizado com payload diferente',
        409,
        'IDEMPOTENCY_CONFLICT',
        { key: existing.key },
      );
    }
  }
}

export class InMemoryCrmAuditRepository implements CrmAuditRepository {
  private readonly events = new Map<string, ReturnType<typeof normalizeCrmAuditEvent>>();
  private readonly idempotency = new Map<string, CrmIdempotencyRecord>();

  async createEvent(event: ReturnType<typeof normalizeCrmAuditEvent>) {
    this.events.set(event.id, event);
    return event;
  }

  async listEvents(query: CrmAuditQuery = {}) {
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

  async saveIdempotencyRecord(record: CrmIdempotencyRecord) {
    this.idempotency.set(`${record.scope}:${record.key}`, record);
    return record;
  }
}
