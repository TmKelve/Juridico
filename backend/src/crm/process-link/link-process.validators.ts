import type { LinkProcessCommand } from './link-process.types';
import {
  normalizePositiveInt,
  normalizeText,
  requireText,
} from '../opportunities/crm-opportunity.utils';
import type { CrmActor } from '../opportunities/crm-opportunity.types';
import { CrmContractError } from '../opportunities/crm-opportunity.types';

function validateActor(actor: CrmActor) {
  if (!actor || typeof actor !== 'object') {
    throw new CrmContractError('CRM_INVALID_ACTOR', 400, 'Ator da operação é obrigatório.');
  }

  const email = requireText('actor.email', actor.email, 'Email do ator');
  const role = requireText('actor.role', actor.role, 'Perfil do ator');
  const sub = normalizePositiveInt('actor.sub', actor.sub, 'Identificador do ator');

  return { sub, email, role };
}

export function validateLinkProcessCommand(input: Record<string, unknown>): LinkProcessCommand {
  const confirmLink = input.confirmLink === undefined ? false : Boolean(input.confirmLink);
  if (!confirmLink) {
    throw new CrmContractError(
      'CRM_LINK_CONFIRMATION_REQUIRED',
      400,
      'Confirmação de vínculo ausente. Revise e confirme o vínculo com o processo.',
    );
  }

  return {
    opportunityId: normalizePositiveInt('opportunityId', input.opportunityId, 'Oportunidade'),
    processId: normalizePositiveInt('processId', input.processId, 'Processo'),
    confirmLink,
    summary: normalizeText(input.summary),
    actor: validateActor(input.actor as CrmActor),
  };
}
