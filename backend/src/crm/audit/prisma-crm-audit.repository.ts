import type { CrmAuditEventRecord, CrmAuditQuery, CrmAuditRepository, CrmIdempotencyRecord } from './crm-audit.types';

interface AuditEventDelegate {
  create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
  findMany(args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown>; take?: number }): Promise<Record<string, unknown>[]>;
}

interface IdempotencyDelegate {
  findUnique(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
  create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
}

function toAuditEventRecord(row: Record<string, unknown>): CrmAuditEventRecord {
  return {
    id: String(row.id),
    scope: String(row.scope),
    entityType: row.entityType as CrmAuditEventRecord['entityType'],
    entityId: row.entityId === null || row.entityId === undefined ? null : Number(row.entityId),
    action: String(row.action),
    status: row.status as CrmAuditEventRecord['status'],
    summary: String(row.summary),
    details: (row.details as Record<string, unknown>) ?? {},
    actor: (row.actor as CrmAuditEventRecord['actor']) ?? { source: 'system' },
    occurredAt: new Date(String(row.occurredAt)).toISOString(),
    correlationId: row.correlationId ? String(row.correlationId) : null,
    idempotencyKey: row.idempotencyKey ? String(row.idempotencyKey) : null,
    createdAt: new Date(String(row.createdAt)).toISOString(),
  };
}

function toIdempotencyRecord(row: Record<string, unknown>): CrmIdempotencyRecord {
  return {
    key: String(row.key),
    scope: String(row.scope),
    entityType: row.entityType as CrmIdempotencyRecord['entityType'],
    entityId: row.entityId === null || row.entityId === undefined ? null : Number(row.entityId),
    action: String(row.action),
    payloadHash: String(row.payloadHash),
    responseCode: Number(row.responseCode),
    responseBody: row.responseBody,
    auditEventId: row.auditEventId ? String(row.auditEventId) : null,
    createdAt: new Date(String(row.createdAt)).toISOString(),
  };
}

export function createPrismaCrmAuditRepository(dependencies: {
  crmAuditEvent: AuditEventDelegate;
  crmIdempotencyRequest: IdempotencyDelegate;
}): CrmAuditRepository {
  return {
    async createEvent(event) {
      const created = await dependencies.crmAuditEvent.create({
        data: {
          id: event.id,
          scope: event.scope,
          entityType: event.entityType,
          entityId: event.entityId,
          action: event.action,
          status: event.status,
          summary: event.summary,
          details: event.details,
          actor: event.actor,
          occurredAt: event.occurredAt,
          correlationId: event.correlationId,
          idempotencyKey: event.idempotencyKey,
          createdAt: event.createdAt,
        },
      });

      return toAuditEventRecord(created);
    },

    async listEvents(query: CrmAuditQuery = {}) {
      const rows = await dependencies.crmAuditEvent.findMany({
        where: {
          scope: query.scope,
          entityType: query.entityType,
          entityId: query.entityId,
          action: query.action,
          status: query.status,
          correlationId: query.correlationId,
          idempotencyKey: query.idempotencyKey,
        },
        orderBy: { occurredAt: 'desc' },
        take: query.limit,
      });

      return rows.map(toAuditEventRecord);
    },

    async findIdempotencyRecord(scope, key) {
      const row = await dependencies.crmIdempotencyRequest.findUnique({
        where: { scope_key: { scope, key } },
      });

      return row ? toIdempotencyRecord(row) : null;
    },

    async saveIdempotencyRecord(record) {
      const created = await dependencies.crmIdempotencyRequest.create({
        data: {
          key: record.key,
          scope: record.scope,
          entityType: record.entityType,
          entityId: record.entityId,
          action: record.action,
          payloadHash: record.payloadHash,
          responseCode: record.responseCode,
          responseBody: record.responseBody,
          auditEventId: record.auditEventId ?? null,
          createdAt: record.createdAt,
        },
      });

      return toIdempotencyRecord(created);
    },
  };
}
