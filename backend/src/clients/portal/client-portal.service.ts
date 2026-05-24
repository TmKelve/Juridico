import { CrmContractError } from '../../crm/opportunities/crm-opportunity.types';
import type { ClientPortalRepository, ClientPortalTimelineItem } from './client-portal.types';
import { validateClientPortalFetchInput } from './client-portal.validators';

export class ClientPortalService {
  constructor(private readonly repository: ClientPortalRepository) {}

  async fetch(input: Record<string, unknown>) {
    const normalized = validateClientPortalFetchInput(input);
    const client = await this.repository.findClientById(normalized.clientId);
    if (!client) {
      throw new CrmContractError('CLIENT_NOT_FOUND', 404, 'Cliente nao encontrado.', { clientId: normalized.clientId });
    }

    const [activeProcesses, pendingDocuments, recentPublications, documents, publications, deadlines] = await Promise.all([
      this.repository.countActiveProcesses(normalized.clientId),
      this.repository.countPendingDocuments(normalized.clientId),
      this.repository.countRecentPublications(normalized.clientId),
      normalized.includeDocuments ? this.repository.listDocumentCards(normalized.clientId) : Promise.resolve([]),
      normalized.includePublications ? this.repository.listPublicationCards(normalized.clientId) : Promise.resolve([]),
      normalized.includeDeadlines ? this.repository.listDeadlineCards(normalized.clientId) : Promise.resolve([]),
    ]);

    const activityTimeline = [
      ...documents.map((item) => ({
        entityType: 'document' as const,
        entityId: item.documentId,
        processId: item.processId,
        title: item.title,
        status: item.status,
        occurredAt: item.uploadedAt,
        highlight: item.category,
      })),
      ...publications.map((item) => ({
        entityType: 'publication' as const,
        entityId: item.publicationId,
        processId: item.processId,
        title: item.title,
        status: item.status,
        occurredAt: item.publishedAt,
        highlight: item.requiresAction ? 'acao_requerida' : 'informativo',
      })),
    ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

    const deadlineTimeline = deadlines.map((item) => ({
        entityType: 'deadline' as const,
        entityId: item.deadlineId,
        processId: item.processId,
        title: item.title,
        status: item.status,
        occurredAt: item.dueDate,
        highlight: item.priority,
      }))
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));

    const timeline: ClientPortalTimelineItem[] = [
      ...activityTimeline,
      ...deadlineTimeline,
    ];

    return {
      clientId: normalized.clientId,
      summary: {
        activeProcesses,
        pendingDocuments,
        recentPublications,
      },
      cards: {
        client,
        documents,
        publications,
        deadlines,
      },
      timeline,
    };
  }
}
