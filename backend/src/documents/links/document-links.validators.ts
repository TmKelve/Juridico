import { CrmContractError, normalizeCrmAuditActor, normalizeIdempotencyKey } from '../../crm/audit';
import { documentLinkEntityTypes, type DocumentEntityLink, type DocumentLinkBindInput, type DocumentLinkTargetCheck } from './document-links.types';

function parsePositiveInteger(value: unknown, field: string) {
  if (value === undefined || value === null) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new CrmContractError(`${field} inválido`, 400, 'VALIDATION_ERROR', { field });
  }

  return parsed;
}

function parseOptionalString(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new CrmContractError('Valor textual inválido', 400, 'VALIDATION_ERROR');
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseOccurredAt(value: unknown) {
  const parsed = value === undefined || value === null ? new Date() : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new CrmContractError('occurredAt inválido. Use data/hora ISO válida.', 400, 'VALIDATION_ERROR', { field: 'occurredAt' });
  }

  return parsed.toISOString();
}

export function buildLinkTargets(input: {
  processId?: number | null;
  deadlineId?: number | null;
  attendanceId?: number | null;
  triageItemId?: number | null;
  crmOpportunityId?: number | null;
}) {
  const raw: Array<[typeof documentLinkEntityTypes[number], number | null | undefined]> = [
    ['process', input.processId],
    ['deadline', input.deadlineId],
    ['attendance', input.attendanceId],
    ['triage_item', input.triageItemId],
    ['crm_opportunity', input.crmOpportunityId],
  ];

  const seen = new Set<string>();
  const targets: DocumentLinkTargetCheck[] = [];
  for (const [entityType, entityId] of raw) {
    if (!documentLinkEntityTypes.includes(entityType)) continue;
    if (!entityId) continue;
    const key = `${entityType}:${entityId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push({ entityType, entityId });
  }

  if (!targets.length) {
    throw new CrmContractError('Informe ao menos uma entidade para vínculo documental', 400, 'DOCUMENT_LINK_INVALID', {
      fields: ['processId', 'deadlineId', 'attendanceId', 'triageItemId', 'crmOpportunityId'],
    });
  }

  return targets;
}

export function normalizeDocumentLinkBindInput(input: DocumentLinkBindInput) {
  const documentId = parsePositiveInteger(input.documentId, 'documentId');
  if (!documentId) {
    throw new CrmContractError('documentId é obrigatório', 400, 'VALIDATION_ERROR', { field: 'documentId' });
  }

  const normalized = {
    documentId,
    processId: parsePositiveInteger(input.processId, 'processId'),
    deadlineId: parsePositiveInteger(input.deadlineId, 'deadlineId'),
    attendanceId: parsePositiveInteger(input.attendanceId, 'attendanceId'),
    triageItemId: parsePositiveInteger(input.triageItemId, 'triageItemId'),
    crmOpportunityId: parsePositiveInteger(input.crmOpportunityId, 'crmOpportunityId'),
    actor: normalizeCrmAuditActor(input.actor),
    correlationId: parseOptionalString(input.correlationId),
    idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey),
    occurredAt: parseOccurredAt(input.occurredAt),
  };

  return {
    ...normalized,
    targets: buildLinkTargets(normalized),
  };
}

export function mergeDocumentLinks(existing: DocumentEntityLink[], incoming: DocumentEntityLink[]) {
  const merged = new Map<string, DocumentEntityLink>();
  for (const item of [...existing, ...incoming]) {
    merged.set(`${item.entityType}:${item.entityId}`, item);
  }

  return [...merged.values()];
}
