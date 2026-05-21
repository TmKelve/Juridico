import { CrmContractError, normalizeIdempotencyKey } from '../audit';
import type { OpportunityDocumentAttachInput } from './opportunity-documents.types';

function parseOptionalIsoDate(value: unknown) {
  if (value === undefined || value === null || value === '') return new Date();
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new CrmContractError('uploadedAt inválido. Use data/hora ISO válida.', 400, 'VALIDATION_ERROR', { field: 'uploadedAt' });
  }

  return parsed;
}

function parseOptionalUrl(value: unknown, field: string) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new CrmContractError(`${field} inválido`, 400, 'VALIDATION_ERROR', { field });
  }

  try {
    const url = new URL(value);
    return url.toString();
  } catch {
    throw new CrmContractError(`${field} inválido`, 400, 'VALIDATION_ERROR', { field });
  }
}

function parseOptionalString(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new CrmContractError('Valor textual inválido', 400, 'VALIDATION_ERROR');
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function normalizeOpportunityDocumentAttachInput(input: OpportunityDocumentAttachInput) {
  const opportunityId = Number(input.opportunityId);
  if (!Number.isInteger(opportunityId) || opportunityId <= 0) {
    throw new CrmContractError('opportunityId inválido', 400, 'VALIDATION_ERROR', { field: 'opportunityId' });
  }

  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) {
    throw new CrmContractError('title é obrigatório', 400, 'VALIDATION_ERROR', { field: 'title' });
  }

  const metadata = input.metadata ?? {};
  if (Array.isArray(metadata) || typeof metadata !== 'object') {
    throw new CrmContractError('metadata deve ser um objeto JSON', 400, 'VALIDATION_ERROR', { field: 'metadata' });
  }

  return {
    opportunityId,
    title,
    description: parseOptionalString(input.description) ?? '',
    category: parseOptionalString(input.category) ?? 'Checklist',
    mimeType: parseOptionalString(input.mimeType) ?? 'application/octet-stream',
    previewUrl: parseOptionalUrl(input.previewUrl, 'previewUrl'),
    responsible: parseOptionalString(input.responsible),
    origin: parseOptionalString(input.origin) ?? 'crm_oportunidade',
    uploadedAt: parseOptionalIsoDate(input.uploadedAt),
    requiredChecklist: Boolean(input.requiredChecklist),
    pendingForAdvance: Boolean(input.pendingForAdvance),
    createdBy: parseOptionalString(input.createdBy) ?? parseOptionalString(input.actor.email),
    externalDocumentId: parseOptionalString(input.externalDocumentId),
    idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey),
    actor: input.actor,
    metadata,
  };
}
