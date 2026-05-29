import { CrmContractError, type CrmOpportunityRecord } from './crm-opportunity.types';

export const OPPORTUNITY_STAGE_SEQUENCE = [
  'acao_recomendada',
  'em_contato',
  'proposta_enviada',
  'negociacao',
  'ganha',
  'perdida',
] as const;

export function normalizeText(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

export function requireText(field: string, value: unknown, label: string) {
  const normalized = normalizeText(value);
  if (!normalized) {
    throw new CrmContractError('CRM_REQUIRED_FIELD', 400, `${label} é obrigatório`, { field });
  }

  return normalized;
}

export function normalizePositiveInt(field: string, value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new CrmContractError('CRM_INVALID_NUMBER', 400, `${label} deve ser um inteiro positivo`, {
      field,
      value,
    });
  }

  return value;
}

export function parseOptionalDateTime(field: string, value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalized = requireText(field, value, field);
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new CrmContractError('CRM_INVALID_DATETIME', 400, `${field} inválido. Use data/hora ISO válida.`, {
      field,
      value,
    });
  }

  return parsed;
}

export function normalizeProcessNumber(value?: string | null) {
  return (value ?? '').replace(/\D/g, '');
}

export function getResponsibleLabel(email?: string | null) {
  if (!email) return null;
  return email.split('@')[0] ?? null;
}

export function validateOpportunityCommercialRules(input: {
  currentStatus: string;
  nextStatus: string;
  responsible: string | null;
  nextContactAt: Date | null;
}) {
  const { currentStatus, nextStatus, responsible, nextContactAt } = input;
  const currentIndex = OPPORTUNITY_STAGE_SEQUENCE.indexOf(currentStatus as (typeof OPPORTUNITY_STAGE_SEQUENCE)[number]);
  const nextIndex = OPPORTUNITY_STAGE_SEQUENCE.indexOf(nextStatus as (typeof OPPORTUNITY_STAGE_SEQUENCE)[number]);

  if (nextStatus === 'em_contato' && !nextContactAt) {
    return 'O estágio "Em contato" exige próximo contato preenchido.';
  }

  if (nextStatus !== 'acao_recomendada' && !responsible) {
    return 'Defina um responsável para avançar a oportunidade.';
  }

  if (currentIndex >= 0 && nextIndex >= 0 && nextIndex > currentIndex + 1) {
    return 'Avanço inválido: mova a oportunidade etapa por etapa.';
  }

  return null;
}

export function assertOpportunityReadyForConversion(opportunity: CrmOpportunityRecord) {
  if (!normalizeText(opportunity.responsible)) {
    throw new CrmContractError(
      'CRM_OPPORTUNITY_RESPONSIBLE_REQUIRED',
      400,
      'Defina um responsável comercial antes da conversão.',
    );
  }

  if (opportunity.status === 'em_contato' && !opportunity.nextContactAt) {
    throw new CrmContractError(
      'CRM_OPPORTUNITY_NEXT_CONTACT_REQUIRED',
      400,
      'O estágio "Em contato" exige próximo contato antes da conversão.',
    );
  }
}

export function resolveOpportunitySummary(currentSummary: string, nextSummary?: string | null) {
  return normalizeText(nextSummary) ?? currentSummary;
}
