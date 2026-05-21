import { CrmAuditService, CrmContractError } from '../audit';
import type { OpportunityDocumentAttachInput, OpportunityDocumentsRepository } from './opportunity-documents.types';
import { normalizeOpportunityDocumentAttachInput } from './opportunity-documents.validators';

export class OpportunityDocumentsService {
  constructor(
    private readonly repository: OpportunityDocumentsRepository,
    private readonly auditService: CrmAuditService,
  ) {}

  async attachDocument(input: OpportunityDocumentAttachInput) {
    const normalized = normalizeOpportunityDocumentAttachInput(input);
    const opportunity = await this.repository.findOpportunityById(normalized.opportunityId);
    if (!opportunity) {
      throw new CrmContractError('Oportunidade não encontrada', 404, 'OPPORTUNITY_NOT_FOUND', {
        opportunityId: normalized.opportunityId,
      });
    }

    return this.auditService.runIdempotent({
      key: normalized.idempotencyKey,
      scope: 'crm.opportunity.attachDocument',
      entityType: 'crm_opportunity',
      entityId: normalized.opportunityId,
      action: 'attach_document',
      payload: normalized,
      execute: async () => {
        const document = await this.repository.attachDocumentToOpportunity({
          opportunityId: normalized.opportunityId,
          processId: opportunity.convertedProcessId ?? null,
          title: normalized.title,
          description: normalized.description,
          category: normalized.category,
          mimeType: normalized.mimeType,
          previewUrl: normalized.previewUrl,
          responsible: normalized.responsible ?? opportunity.responsible ?? null,
          origin: normalized.origin,
          uploadedAt: normalized.uploadedAt,
          requiredChecklist: normalized.requiredChecklist,
          pendingForAdvance: normalized.pendingForAdvance,
          createdBy: normalized.createdBy,
          externalDocumentId: normalized.externalDocumentId,
          metadata: normalized.metadata,
        });

        const auditEvent = await this.auditService.record({
          scope: 'audit.event',
          entityType: 'crm_opportunity_document',
          entityId: document.attachmentId,
          action: 'crm.opportunity.attachDocument',
          status: 'success',
          summary: `Documento ${document.title} anexado à oportunidade #${document.opportunityId}`,
          details: {
            opportunityId: document.opportunityId,
            documentId: document.documentId,
            attachmentId: document.attachmentId,
            externalDocumentId: document.externalDocumentId,
            metadata: normalized.metadata,
          },
          actor: normalized.actor,
          occurredAt: normalized.uploadedAt,
          idempotencyKey: normalized.idempotencyKey,
        });

        return {
          document,
          auditEvent,
        };
      },
      onConflictMessage: 'idempotencyKey já foi usado em outro anexo comercial',
    });
  }
}
