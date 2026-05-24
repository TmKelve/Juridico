import { createHash } from 'crypto';
import { CrmContractError, normalizeCrmAuditActor, normalizeIdempotencyKey } from '../../crm/audit';
import type { DocumentArtifactGenerateInput } from './document-artifacts.types';

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

function parsePositiveInteger(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new CrmContractError(`${field} inválido`, 400, 'VALIDATION_ERROR', { field });
  }

  return parsed;
}

function parseNonEmptyString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new CrmContractError(`${field} é obrigatório`, 400, 'VALIDATION_ERROR', { field });
  }

  return value.trim();
}

function parseOptionalString(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new CrmContractError('Valor textual inválido', 400, 'VALIDATION_ERROR');
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parsePayload(value: unknown) {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    throw new CrmContractError('payload deve ser um objeto JSON', 400, 'DOCUMENT_ARTIFACT_TEMPLATE_INVALID', {
      field: 'payload',
    });
  }

  return value as Record<string, unknown>;
}

function parseOccurredAt(value: unknown) {
  const parsed = value === undefined || value === null ? new Date() : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new CrmContractError('occurredAt inválido. Use data/hora ISO válida.', 400, 'VALIDATION_ERROR', { field: 'occurredAt' });
  }

  return parsed.toISOString();
}

export function checksumPayload(payload: Record<string, unknown>) {
  return createHash('sha256').update(stableSerialize(payload)).digest('hex');
}

export function normalizeDocumentArtifactGenerateInput(input: DocumentArtifactGenerateInput) {
  const payload = parsePayload(input.payload);
  return {
    templateId: String(input.templateId),
    processId: parsePositiveInteger(input.processId, 'processId'),
    documentTitle: parseNonEmptyString(input.documentTitle, 'documentTitle'),
    payload,
    payloadChecksum: checksumPayload(payload),
    persistAsDocument: Boolean(input.persistAsDocument),
    actor: normalizeCrmAuditActor(input.actor),
    idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey),
    correlationId: parseOptionalString(input.correlationId),
    category: parseOptionalString(input.category) ?? 'Artefato',
    origin: parseOptionalString(input.origin) ?? 'interno',
    createdBy: parseOptionalString(input.createdBy),
    occurredAt: parseOccurredAt(input.occurredAt),
  };
}
