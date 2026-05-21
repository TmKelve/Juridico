import { CrmContractError, normalizeIdempotencyKey } from '../audit';
import type { OpportunityContactHistoryInput } from './opportunity-contact-history.types';

function parseOptionalIsoDate(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new CrmContractError(`${field} inválido. Use data/hora ISO válida.`, 400, 'VALIDATION_ERROR', { field });
  }

  return parsed;
}

export function normalizeOpportunityContactHistoryInput(input: OpportunityContactHistoryInput) {
  const opportunityId = Number(input.opportunityId);
  if (!Number.isInteger(opportunityId) || opportunityId <= 0) {
    throw new CrmContractError('opportunityId inválido', 400, 'VALIDATION_ERROR', { field: 'opportunityId' });
  }

  const summary = typeof input.summary === 'string' ? input.summary.trim() : '';
  if (!summary) {
    throw new CrmContractError('Resumo do contato é obrigatório', 400, 'VALIDATION_ERROR', { field: 'summary' });
  }

  const kind = typeof input.kind === 'string' && input.kind.trim() ? input.kind.trim() : 'contato';
  const occurredAt = parseOptionalIsoDate(input.occurredAt, 'occurredAt') ?? new Date();
  const nextContactAt = parseOptionalIsoDate(input.nextContactAt, 'nextContactAt');
  const metadata = input.metadata ?? {};
  if (Array.isArray(metadata) || typeof metadata !== 'object') {
    throw new CrmContractError('metadata deve ser um objeto JSON', 400, 'VALIDATION_ERROR', { field: 'metadata' });
  }

  return {
    opportunityId,
    summary,
    kind,
    occurredAt,
    nextContactAt,
    idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey),
    actor: input.actor,
    metadata,
  };
}
