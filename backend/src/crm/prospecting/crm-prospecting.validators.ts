import { CrmContractError } from '../opportunities/crm-opportunity.types';
import { normalizeText, requireText } from '../opportunities/crm-opportunity.utils';
import type { ClientProspectSignalInput, ProspectSourceType } from './crm-prospecting.types';

const sourceTypes = new Set<ProspectSourceType>(['publicacao', 'manual', 'importacao']);

function normalizeCpfCnpj(value: unknown) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length !== 11 && digits.length !== 14) {
    throw new CrmContractError('PROSPECT_INVALID_DOCUMENT', 400, 'CPF/CNPJ invalido.', { cpfCnpj: value });
  }

  return digits;
}

export function validateClientProspectSignalInput(input: Record<string, unknown>): ClientProspectSignalInput {
  const sourceType = requireText('sourceType', input.sourceType, 'Origem') as ProspectSourceType;
  if (!sourceTypes.has(sourceType)) {
    throw new CrmContractError('PROSPECT_INVALID_DOCUMENT', 400, 'Origem da prospeccao invalida.', { sourceType });
  }

  return {
    cpfCnpj: normalizeCpfCnpj(input.cpfCnpj),
    personName: normalizeText(input.personName),
    sourceType,
    sourceReference: requireText('sourceReference', input.sourceReference, 'Referência de origem'),
    summary: requireText('summary', input.summary, 'Resumo'),
    idempotencyKey: requireText('idempotencyKey', input.idempotencyKey, 'Idempotency key'),
  };
}
