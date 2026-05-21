import {
  crmAuditEntityTypes,
  crmAuditStatuses,
  crmAuditSources,
  type CrmAuditActor,
  type CrmAuditEventInput,
  type CrmAuditEventRecord,
  type CrmAuditStatus,
} from './crm-audit.types';

export class CrmContractError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CrmContractError';
  }
}

function ensureNonEmptyString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new CrmContractError(`${field} é obrigatório`, 400, 'VALIDATION_ERROR', { field });
  }

  return value.trim();
}

function ensureOptionalString(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new CrmContractError('Valor textual inválido', 400, 'VALIDATION_ERROR');
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function ensureIsoDate(value: unknown, field: string) {
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new CrmContractError(`${field} inválido. Use data/hora ISO válida.`, 400, 'VALIDATION_ERROR', { field });
  }

  return parsed.toISOString();
}

export function assertCrmAuditStatus(value: string): CrmAuditStatus {
  if (!crmAuditStatuses.includes(value as CrmAuditStatus)) {
    throw new CrmContractError('status de auditoria inválido', 400, 'VALIDATION_ERROR', { field: 'status', value });
  }

  return value as CrmAuditStatus;
}

export function normalizeCrmAuditActor(input: CrmAuditActor): CrmAuditActor {
  if (!crmAuditSources.includes(input.source)) {
    throw new CrmContractError('source do ator inválido', 400, 'VALIDATION_ERROR', { field: 'actor.source' });
  }

  return {
    source: input.source,
    userId: typeof input.userId === 'number' ? input.userId : null,
    email: ensureOptionalString(input.email),
    role: ensureOptionalString(input.role),
  };
}

export function normalizeCrmAuditEvent(input: CrmAuditEventInput & { id?: string; createdAt?: string }): CrmAuditEventRecord {
  const scope = ensureNonEmptyString(input.scope, 'scope');
  const entityType = ensureNonEmptyString(input.entityType, 'entityType');
  if (!crmAuditEntityTypes.includes(entityType as (typeof crmAuditEntityTypes)[number])) {
    throw new CrmContractError('entityType de auditoria inválido', 400, 'VALIDATION_ERROR', { field: 'entityType', value: entityType });
  }

  const entityId = input.entityId === null || input.entityId === undefined ? null : Number(input.entityId);
  if (entityId !== null && !Number.isInteger(entityId)) {
    throw new CrmContractError('entityId inválido', 400, 'VALIDATION_ERROR', { field: 'entityId' });
  }

  const details = input.details ?? {};
  if (Array.isArray(details) || typeof details !== 'object') {
    throw new CrmContractError('details deve ser um objeto JSON', 400, 'VALIDATION_ERROR', { field: 'details' });
  }

  return {
    id: input.id?.trim() || `${scope}:${entityType}:${entityId ?? 'na'}:${Date.now()}`,
    scope,
    entityType: entityType as CrmAuditEventRecord['entityType'],
    entityId,
    action: ensureNonEmptyString(input.action, 'action'),
    status: assertCrmAuditStatus(input.status),
    summary: ensureNonEmptyString(input.summary, 'summary'),
    details,
    actor: normalizeCrmAuditActor(input.actor),
    occurredAt: ensureIsoDate(input.occurredAt ?? new Date(), 'occurredAt'),
    correlationId: ensureOptionalString(input.correlationId),
    idempotencyKey: ensureOptionalString(input.idempotencyKey),
    createdAt: input.createdAt?.trim() || new Date().toISOString(),
  };
}

export function normalizeIdempotencyKey(value: unknown) {
  const key = ensureOptionalString(value);
  if (!key) return null;
  if (key.length > 120) {
    throw new CrmContractError('idempotencyKey excede 120 caracteres', 400, 'VALIDATION_ERROR', { field: 'idempotencyKey' });
  }

  return key;
}
