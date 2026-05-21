import { CrmContractError } from '../opportunities/crm-opportunity.types';
import {
  assertOpportunityReadyForConversion,
  resolveOpportunitySummary,
} from '../opportunities/crm-opportunity.utils';
import type {
  LinkProcessCommand,
  LinkProcessRepository,
  LinkProcessResult,
} from './link-process.types';

export class CrmOpportunityProcessLinkService {
  constructor(private readonly repository: LinkProcessRepository) {}

  async execute(command: LinkProcessCommand): Promise<LinkProcessResult> {
    const opportunity = await this.repository.findOpportunityById(command.opportunityId);
    if (!opportunity) {
      throw new CrmContractError('CRM_OPPORTUNITY_NOT_FOUND', 404, 'Oportunidade não encontrada.');
    }

    const process = await this.repository.findProcessById(command.processId);
    if (!process) {
      throw new CrmContractError('CRM_PROCESS_NOT_FOUND', 404, 'Processo não encontrado.');
    }

    if (opportunity.convertedProcessId) {
      if (opportunity.convertedProcessId === process.id) {
        return {
          outcome: 'already_linked',
          opportunity,
          process,
          idempotent: true,
        };
      }

      throw new CrmContractError(
        'CRM_OPPORTUNITY_ALREADY_LINKED',
        409,
        `Oportunidade já vinculada ao processo #${opportunity.convertedProcessId}.`,
        {
          currentProcessId: opportunity.convertedProcessId,
          requestedProcessId: process.id,
        },
      );
    }

    assertOpportunityReadyForConversion(opportunity);

    const linkedOpportunity = await this.repository.linkOpportunityToProcess({
      opportunityId: opportunity.id,
      processId: process.id,
      clientId: process.clientId ?? process.clientRecord?.id ?? opportunity.clientId ?? null,
      personName: process.clientRecord?.name ?? process.client,
      status: 'ganha',
      summary: resolveOpportunitySummary(opportunity.summary, command.summary),
      contactEvent: {
        kind: 'vinculo_processo',
        summary: `Vinculada ao processo #${process.id}.`,
        createdBy: command.actor.email,
        createdAt: new Date(),
      },
    });

    return {
      outcome: 'linked',
      opportunity: linkedOpportunity,
      process,
      idempotent: false,
    };
  }
}
