import type {
  PlatformAuditEventInput,
  PlatformAuditEventRecord,
  PlatformAuditListQuery,
  PlatformAuditRepository,
  PlatformAuditWriter,
  PlatformAuditStatus,
} from './platform-audit.types';
import { platformAuditStatuses } from './platform-audit.types';

export class PlatformAuditError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number = 400,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PlatformAuditError';
  }
}

function normalizeText(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new PlatformAuditError('AUDIT_INVALID', `${field} é obrigatório.`, 400, { field });
  }
  return normalized;
}

function normalizeDate(value: string | Date | null | undefined, field: string) {
  if (value === null || value === undefined) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new PlatformAuditError('AUDIT_INVALID', `${field} inválido.`, 400, { field });
  }
  return parsed.toISOString();
}

function normalizeStatus(value: string): PlatformAuditStatus {
  if (!platformAuditStatuses.includes(value as PlatformAuditStatus)) {
    throw new PlatformAuditError('AUDIT_INVALID', 'status inválido.', 400, { status: value });
  }
  return value as PlatformAuditStatus;
}

function normalizeObject(value: Record<string, unknown> | null | undefined, field: string) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value) || typeof value !== 'object') {
    throw new PlatformAuditError('AUDIT_INVALID', `${field} deve ser objeto ou null.`, 400, { field });
  }
  return value;
}

export class PlatformAuditService implements PlatformAuditWriter {
  constructor(private readonly repository: PlatformAuditRepository) {}

  normalizeEvent(input: PlatformAuditEventInput): PlatformAuditEventRecord {
    const occurredAt = normalizeDate(input.occurredAt ?? new Date(), 'occurredAt');
    if (!occurredAt) {
      throw new PlatformAuditError('AUDIT_INVALID', 'occurredAt inválido.');
    }

    if (!Number.isFinite(input.companyId) || input.companyId <= 0) {
      throw new PlatformAuditError('AUDIT_INVALID', 'companyId inválido.', 400, { companyId: input.companyId });
    }

    const context = normalizeObject(input.context, 'context') ?? {};

    return {
      id: typeof input.id === 'string' && input.id.trim()
        ? input.id.trim()
        : `platform_audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      companyId: Math.trunc(input.companyId),
      actor: normalizeText(input.actor, 'actor'),
      action: normalizeText(input.action, 'action'),
      status: normalizeStatus(input.status),
      occurredAt,
      context,
      metadata: normalizeObject(input.metadata, 'metadata'),
      createdAt: new Date().toISOString(),
    };
  }

  async record(input: PlatformAuditEventInput) {
    return this.repository.createEvent(this.normalizeEvent(input));
  }

  async list(input: PlatformAuditListQuery) {
    const from = normalizeDate(input.from, 'from');
    const to = normalizeDate(input.to, 'to');
    if (from && to && from > to) {
      throw new PlatformAuditError('AUDIT_INVALID', 'faixa de datas inválida.', 400, { from, to });
    }

    if (input.limit !== undefined && (!Number.isFinite(input.limit) || input.limit <= 0)) {
      throw new PlatformAuditError('AUDIT_INVALID', 'limit inválido.', 400, { limit: input.limit });
    }

    if (input.companyId !== undefined && (!Number.isFinite(input.companyId) || input.companyId <= 0)) {
      throw new PlatformAuditError('AUDIT_INVALID', 'companyId inválido.', 400, { companyId: input.companyId });
    }

    const query: PlatformAuditListQuery = {
      companyId: input.companyId === undefined ? undefined : Math.trunc(input.companyId),
      actor: input.actor ? input.actor.trim() : undefined,
      action: input.action ? input.action.trim() : undefined,
      from,
      to,
      limit: input.limit === undefined ? undefined : Math.trunc(input.limit),
    };

    return this.repository.listEvents(query);
  }

  createRecorder(defaults: Pick<PlatformAuditEventInput, 'companyId' | 'actor'>): PlatformAuditWriter {
    return {
      record: (event) => this.record({
        ...event,
        companyId: defaults.companyId,
        actor: defaults.actor,
      }),
    };
  }
}

export class InMemoryPlatformAuditRepository implements PlatformAuditRepository {
  private readonly events = new Map<string, PlatformAuditEventRecord>();

  async createEvent(event: PlatformAuditEventRecord) {
    this.events.set(event.id, event);
    return event;
  }

  async listEvents(query: PlatformAuditListQuery) {
    const rows = [...this.events.values()].filter((event) => {
      if (query.companyId !== undefined && event.companyId !== query.companyId) return false;
      if (query.actor !== undefined && event.actor !== query.actor) return false;
      if (query.action !== undefined && event.action !== query.action) return false;
      if (query.from && event.occurredAt < query.from) return false;
      if (query.to && event.occurredAt > query.to) return false;
      return true;
    });

    rows.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
    return typeof query.limit === 'number' ? rows.slice(0, query.limit) : rows;
  }
}
