import { createHash } from 'crypto';
import { CrmContractError } from '../../crm/opportunities/crm-opportunity.types';
import { normalizePositiveInt, requireText } from '../../crm/opportunities/crm-opportunity.utils';
import type { ClientConsentLegalBasis, ClientConsentUpdateInput, ContactPreferences } from './client-consent.types';

const legalBasisValues = new Set<ClientConsentLegalBasis>([
  'consentimento',
  'execucao_contrato',
  'legitimo_interesse',
]);

function validatePreferences(input: unknown): ContactPreferences {
  if (!input || typeof input !== 'object') {
    throw new CrmContractError('CONSENT_INVALID', 400, 'Preferências de contato inválidas.');
  }

  const preferences = input as Record<string, unknown>;
  const keys = ['email', 'whatsapp', 'portal'] as const;
  for (const key of keys) {
    if (typeof preferences[key] !== 'boolean') {
      throw new CrmContractError('CONSENT_INVALID', 400, 'Preferências ou base legal invalidas.', { field: key });
    }
  }

  return {
    email: preferences.email as boolean,
    whatsapp: preferences.whatsapp as boolean,
    portal: preferences.portal as boolean,
  };
}

function parseIsoDate(field: string, value: unknown) {
  const parsed = new Date(requireText(field, value, field));
  if (Number.isNaN(parsed.getTime())) {
    throw new CrmContractError('CONSENT_INVALID', 400, 'Preferências ou base legal invalidas.', { field });
  }

  return parsed.toISOString();
}

export function validateClientConsentUpdateInput(input: Record<string, unknown>): ClientConsentUpdateInput {
  const legalBasis = requireText('legalBasis', input.legalBasis, 'Base legal') as ClientConsentLegalBasis;
  if (!legalBasisValues.has(legalBasis)) {
    throw new CrmContractError('CONSENT_INVALID', 400, 'Preferências ou base legal invalidas.', { field: 'legalBasis' });
  }

  return {
    clientId: normalizePositiveInt('clientId', input.clientId, 'Cliente'),
    preferences: validatePreferences(input.preferences),
    legalBasis,
    capturedAt: parseIsoDate('capturedAt', input.capturedAt),
    capturedBy: requireText('capturedBy', input.capturedBy, 'Capturado por'),
  };
}

export function buildClientConsentIdempotencyKey(input: ClientConsentUpdateInput) {
  const checksum = createHash('sha256')
    .update(JSON.stringify(input.preferences))
    .digest('hex');

  return `${input.clientId}:${input.capturedAt}:${checksum}`;
}
