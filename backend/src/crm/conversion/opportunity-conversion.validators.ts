import { CrmContractError } from '../opportunities/crm-opportunity.types';
import type { CrmActor } from '../opportunities/crm-opportunity.types';
import {
  normalizePositiveInt,
  normalizeProcessNumber,
  normalizeText,
  requireText,
} from '../opportunities/crm-opportunity.utils';
import type { OpportunityConversionCommand } from './opportunity-conversion.types';

function validateActor(actor: CrmActor) {
  if (!actor || typeof actor !== 'object') {
    throw new CrmContractError('CRM_INVALID_ACTOR', 400, 'Ator da operação é obrigatório.');
  }

  return {
    sub: normalizePositiveInt('actor.sub', actor.sub, 'Identificador do ator'),
    email: requireText('actor.email', actor.email, 'Email do ator'),
    role: requireText('actor.role', actor.role, 'Perfil do ator'),
  };
}

export function validateOpportunityConversionCommand(input: Record<string, unknown>): OpportunityConversionCommand {
  const confirmConversion = input.confirmConversion === undefined ? false : Boolean(input.confirmConversion);
  if (!confirmConversion) {
    throw new CrmContractError(
      'CRM_CONVERSION_CONFIRMATION_REQUIRED',
      400,
      'Confirmação de conversão ausente. Revise e confirme a conversão.',
    );
  }

  const clientId = input.clientId === undefined || input.clientId === null
    ? null
    : normalizePositiveInt('clientId', input.clientId, 'Cliente');
  const normalizedProcessNumber = normalizeProcessNumber(normalizeText(input.processNumber));

  return {
    opportunityId: normalizePositiveInt('opportunityId', input.opportunityId, 'Oportunidade'),
    confirmConversion,
    clientId,
    clientName: requireText('clientName', input.clientName, 'Cliente'),
    processTitle: requireText('processTitle', input.processTitle, 'Título do processo'),
    processPhase: requireText('processPhase', input.processPhase, 'Fase do processo'),
    processStatus: requireText('processStatus', input.processStatus, 'Status do processo'),
    processNumber: normalizedProcessNumber || null,
    summary: normalizeText(input.summary),
    actor: validateActor(input.actor as CrmActor),
  };
}
