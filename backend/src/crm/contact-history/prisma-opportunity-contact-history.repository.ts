import type {
  OpportunityContactContext,
  OpportunityContactHistoryRepository,
  OpportunityContactHistoryResult,
} from './opportunity-contact-history.types';

interface CrmOpportunityDelegate {
  findUnique(args: { where: { id: number }; select: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
  update(args: { where: { id: number }; data: Record<string, unknown>; include: Record<string, unknown> }): Promise<Record<string, unknown>>;
}

function toOpportunityContext(row: Record<string, unknown>): OpportunityContactContext {
  return {
    id: Number(row.id),
    status: String(row.status),
    responsible: row.responsible ? String(row.responsible) : null,
    lastContactAt: row.lastContactAt ? new Date(String(row.lastContactAt)) : null,
    nextContactAt: row.nextContactAt ? new Date(String(row.nextContactAt)) : null,
  };
}

export function createPrismaOpportunityContactHistoryRepository(dependencies: {
  crmOpportunity: CrmOpportunityDelegate;
}): OpportunityContactHistoryRepository {
  return {
    async findOpportunityById(opportunityId) {
      const row = await dependencies.crmOpportunity.findUnique({
        where: { id: opportunityId },
        select: {
          id: true,
          status: true,
          responsible: true,
          lastContactAt: true,
          nextContactAt: true,
        },
      });

      return row ? toOpportunityContext(row) : null;
    },

    async appendContactEvent(input) {
      const updated = await dependencies.crmOpportunity.update({
        where: { id: input.opportunityId },
        data: {
          lastContactAt: input.opportunityLastContactAt,
          nextContactAt: input.opportunityNextContactAt,
          contactEvents: {
            create: {
              kind: input.kind,
              summary: input.summary,
              createdBy: input.createdBy,
              createdAt: input.eventCreatedAt,
            },
          },
        },
        include: {
          contactEvents: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      const event = Array.isArray(updated.contactEvents) ? updated.contactEvents[0] : null;
      if (!event) {
        throw new Error('Falha ao persistir CrmContactEvent para a oportunidade');
      }

      const result: OpportunityContactHistoryResult = {
        opportunityId: input.opportunityId,
        lastContactAt: new Date(String(updated.lastContactAt ?? input.opportunityLastContactAt)).toISOString(),
        nextContactAt: updated.nextContactAt ? new Date(String(updated.nextContactAt)).toISOString() : null,
        event: {
          id: Number(event.id),
          opportunityId: input.opportunityId,
          kind: String(event.kind),
          summary: String(event.summary),
          createdBy: event.createdBy ? String(event.createdBy) : null,
          createdAt: new Date(String(event.createdAt)).toISOString(),
        },
        auditEvent: {} as OpportunityContactHistoryResult['auditEvent'],
      };

      return result;
    },
  };
}
