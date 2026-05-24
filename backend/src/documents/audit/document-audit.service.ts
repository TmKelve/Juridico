import { CrmContractError, assertCrmAuditStatus, normalizeCrmAuditActor, normalizeIdempotencyKey } from '../../crm/audit';
import {
  documentAuditEntityTypes,
  documentAuditEventTypes,
  type CrmCompatibleAuditService,
  type DocumentAuditEvent,
  type DocumentAuditEventRecord,
  type DocumentAuditQuery,
  type DocumentAuditSink,
} from './document-audit.types';

function ensurePositiveInteger(value: unknown, field: string) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new CrmContractError(`${field} inválido`, 400, 'VALIDATION_ERROR', { field });
  }

  return parsed;
}

function ensureOptionalString(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new CrmContractError('Valor textual inválido', 400, 'VALIDATION_ERROR');
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function ensureObject(value: unknown, field: string) {
  if (value === undefined || value === null) return {};
  if (Array.isArray(value) || typeof value !== 'object') {
    throw new CrmContractError(`${field} deve ser um objeto JSON`, 400, 'VALIDATION_ERROR', { field });
  }

  return value as Record<string, unknown>;
}

function ensureKnownEventType(value: string) {
  if (!documentAuditEventTypes.includes(value as (typeof documentAuditEventTypes)[number])) {
    throw new CrmContractError('eventType documental inválido', 400, 'VALIDATION_ERROR', { field: 'eventType', value });
  }

  return value as DocumentAuditEventRecord['eventType'];
}

function ensureKnownEntityType(value: string) {
  if (!documentAuditEntityTypes.includes(value as (typeof documentAuditEntityTypes)[number])) {
    throw new CrmContractError('entityType documental inválido', 400, 'VALIDATION_ERROR', { field: 'entityType', value });
  }

  return value as DocumentAuditEventRecord['entityType'];
}

function ensureIsoDate(value: unknown, field: string) {
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new CrmContractError(`${field} inválido. Use data/hora ISO válida.`, 400, 'VALIDATION_ERROR', { field });
  }

  return parsed.toISOString();
}

function sortByOccurredAtDesc(items: DocumentAuditEventRecord[]) {
  return [...items].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

export class InMemoryDocumentAuditSink implements DocumentAuditSink {
  private readonly events: DocumentAuditEventRecord[] = [];

  async append(event: DocumentAuditEventRecord) {
    this.events.push(event);
    return event;
  }

  async list(query: DocumentAuditQuery = {}) {
    const filtered = this.events.filter((event) => {
      if (query.scope !== undefined && event.scope !== query.scope) return false;
      if (query.eventType !== undefined && event.eventType !== query.eventType) return false;
      if (query.entityType !== undefined && event.entityType !== query.entityType) return false;
      if (query.entityId !== undefined && event.entityId !== query.entityId) return false;
      if (query.documentId !== undefined && event.documentId !== query.documentId) return false;
      if (query.processId !== undefined && event.processId !== query.processId) return false;
      if (query.status !== undefined && event.status !== query.status) return false;
      if (query.correlationId !== undefined && event.correlationId !== query.correlationId) return false;
      if (query.idempotencyKey !== undefined && event.idempotencyKey !== query.idempotencyKey) return false;
      return true;
    });

    const sorted = sortByOccurredAtDesc(filtered);
    return typeof query.limit === 'number' ? sorted.slice(0, query.limit) : sorted;
  }
}

export class CrmBackedDocumentAuditSink implements DocumentAuditSink {
  constructor(private readonly auditService: CrmCompatibleAuditService) {}

  async append(event: DocumentAuditEventRecord) {
    await this.auditService.record({
      scope: event.scope,
      entityType: 'crm_opportunity_document',
      entityId: event.documentId ?? event.entityId,
      action: event.eventType,
      status: event.status,
      summary: event.summary,
      details: {
        ...event.details,
        documentAuditEntityType: event.entityType,
        documentAuditEntityId: event.entityId,
        documentId: event.documentId,
        processId: event.processId ?? null,
      },
      actor: event.actor,
      correlationId: event.correlationId,
      idempotencyKey: event.idempotencyKey,
      occurredAt: event.occurredAt,
    });

    return event;
  }

  async list(query: DocumentAuditQuery = {}) {
    const rows = await this.auditService.list({
      scope: query.scope ?? 'documents',
      entityType: 'crm_opportunity_document',
      entityId: query.documentId ?? query.entityId,
      action: query.eventType,
      status: query.status,
      correlationId: query.correlationId,
      idempotencyKey: query.idempotencyKey,
      limit: query.limit,
    });

    const mapped = rows.map((row) => {
      const details = (row.details ?? {}) as Record<string, unknown>;
      return this.toDocumentAuditRecord(row, details);
    });

    return mapped.filter((event) => {
      if (query.entityType !== undefined && event.entityType !== query.entityType) return false;
      if (query.entityId !== undefined && event.entityId !== query.entityId) return false;
      if (query.documentId !== undefined && event.documentId !== query.documentId) return false;
      if (query.processId !== undefined && event.processId !== query.processId) return false;
      return true;
    });
  }

  private toDocumentAuditRecord(row: Awaited<ReturnType<CrmCompatibleAuditService['record']>>, details: Record<string, unknown>) {
    return {
      id: row.id,
      scope: row.scope,
      eventType: ensureKnownEventType(row.action),
      entityType: ensureKnownEntityType(String(details.documentAuditEntityType ?? 'document')),
      entityId: ensurePositiveInteger(details.documentAuditEntityId ?? row.entityId, 'entityId'),
      documentId: ensurePositiveInteger(details.documentId ?? row.entityId, 'documentId'),
      processId: ensurePositiveInteger(details.processId, 'processId'),
      status: row.status,
      summary: row.summary,
      details,
      actor: row.actor,
      correlationId: row.correlationId,
      idempotencyKey: row.idempotencyKey,
      occurredAt: row.occurredAt,
      createdAt: row.createdAt,
    };
  }
}

export class DocumentAuditService {
  constructor(private readonly sink: DocumentAuditSink) {}

  normalize(input: DocumentAuditEvent): DocumentAuditEventRecord {
    return {
      id: ensureOptionalString(input.id) ?? `documents:${input.eventType}:${input.documentId ?? input.entityId ?? 'na'}:${Date.now()}`,
      scope: ensureOptionalString(input.scope) ?? 'documents',
      eventType: ensureKnownEventType(input.eventType),
      entityType: ensureKnownEntityType(input.entityType),
      entityId: ensurePositiveInteger(input.entityId, 'entityId'),
      documentId: ensurePositiveInteger(input.documentId, 'documentId'),
      processId: ensurePositiveInteger(input.processId, 'processId'),
      status: assertCrmAuditStatus(input.status),
      summary: typeof input.summary === 'string' && input.summary.trim()
        ? input.summary.trim()
        : (() => {
            throw new CrmContractError('summary é obrigatório', 400, 'VALIDATION_ERROR', { field: 'summary' });
          })(),
      details: ensureObject(input.details, 'details'),
      actor: normalizeCrmAuditActor(input.actor),
      correlationId: ensureOptionalString(input.correlationId),
      idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey),
      occurredAt: ensureIsoDate(input.occurredAt, 'occurredAt'),
      createdAt: ensureOptionalString(input.createdAt) ?? new Date().toISOString(),
    };
  }

  async record(input: DocumentAuditEvent) {
    return this.sink.append(this.normalize(input));
  }

  async recordMany(inputs: DocumentAuditEvent[]) {
    const output: DocumentAuditEventRecord[] = [];
    for (const input of inputs) {
      output.push(await this.record(input));
    }

    return output;
  }

  async query(query: DocumentAuditQuery = {}) {
    return this.sink.list(query);
  }
}
