import { CrmAuditService, CrmContractError } from '../audit';
import type {
  OpportunityContactHistoryInput,
  OpportunityContactHistoryRepository,
} from './opportunity-contact-history.types';
import { normalizeOpportunityContactHistoryInput } from './opportunity-contact-history.validators';

export class OpportunityContactHistoryService {
  constructor(
    private readonly repository: OpportunityContactHistoryRepository,
    private readonly auditService: CrmAuditService,
  ) {}

  async addContactEvent(input: OpportunityContactHistoryInput) {
    const normalized = normalizeOpportunityContactHistoryInput(input);
    const opportunity = await this.repository.findOpportunityById(normalized.opportunityId);
    if (!opportunity) {
      throw new CrmContractError('Oportunidade não encontrada', 404, 'OPPORTUNITY_NOT_FOUND', {
        opportunityId: normalized.opportunityId,
      });
    }

    if (normalized.nextContactAt === undefined && opportunity.status === 'em_contato' && !opportunity.nextContactAt) {
      throw new CrmContractError(
        'nextContactAt é obrigatório para registrar contato em oportunidade em_contato sem próximo contato definido',
        400,
        'VALIDATION_ERROR',
        { field: 'nextContactAt' },
      );
    }

    const payload = {
      opportunityId: normalized.opportunityId,
      summary: normalized.summary,
      kind: normalized.kind,
      nextContactAt: normalized.nextContactAt === undefined ? opportunity.nextContactAt ?? null : normalized.nextContactAt,
      occurredAt: normalized.occurredAt,
      actorEmail: normalized.actor.email ?? null,
      metadata: normalized.metadata,
    };

    return this.auditService.runIdempotent({
      key: normalized.idempotencyKey,
      scope: 'crm.opportunity.addContactEvent',
      entityType: 'crm_opportunity',
      entityId: normalized.opportunityId,
      action: 'add_contact_event',
      payload,
      execute: async () => {
        const result = await this.repository.appendContactEvent({
          opportunityId: normalized.opportunityId,
          summary: normalized.summary,
          kind: normalized.kind,
          createdBy: normalized.actor.email ?? null,
          eventCreatedAt: normalized.occurredAt,
          opportunityLastContactAt: normalized.occurredAt,
          opportunityNextContactAt: normalized.nextContactAt === undefined ? opportunity.nextContactAt ?? null : normalized.nextContactAt,
          metadata: normalized.metadata,
        });

        const auditEvent = await this.auditService.record({
          scope: 'audit.event',
          entityType: 'crm_contact_event',
          entityId: result.event.id,
          action: 'crm.opportunity.addContactEvent',
          status: 'success',
          summary: `Contato ${result.event.kind} registrado para a oportunidade #${result.opportunityId}`,
          details: {
            opportunityId: result.opportunityId,
            contactEventId: result.event.id,
            nextContactAt: result.nextContactAt,
            metadata: normalized.metadata,
          },
          actor: normalized.actor,
          occurredAt: normalized.occurredAt,
          idempotencyKey: normalized.idempotencyKey,
        });

        return {
          ...result,
          auditEvent,
        };
      },
      onConflictMessage: 'idempotencyKey já foi usado em outro histórico comercial',
    });
  }
}
