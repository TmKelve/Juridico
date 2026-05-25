import { CrmContractError } from '../../crm/audit';
import { ProceduralDocumentChecklistService } from '../checklist';
import type { DocumentApprovalRepository } from './document-approval.types';
import { normalizeDocumentApprovalInput } from './document-approval.validators';

export class DocumentApprovalService {
  constructor(
    private readonly repository: DocumentApprovalRepository,
    private readonly checklistService = new ProceduralDocumentChecklistService(),
  ) {}

  async decide(input: Parameters<typeof normalizeDocumentApprovalInput>[0]) {
    const normalized = normalizeDocumentApprovalInput(input);
    const document = await this.repository.findById(normalized.documentId);
    if (!document) {
      throw new CrmContractError('Documento não encontrado', 404, 'DOCUMENT_NOT_FOUND', {
        documentId: normalized.documentId,
      });
    }

    if (!document.isLatestVersion) {
      throw new CrmContractError('Somente a versão atual pode ser aprovada ou rejeitada', 409, 'DOCUMENT_NOT_LATEST_VERSION', {
        documentId: normalized.documentId,
      });
    }

    let checklist;
    if (normalized.decision === 'approved') {
      const metadata = document.metadata ?? {};
      const providedDocumentTypes = Array.isArray(metadata.relatedDocumentTypes)
        ? metadata.relatedDocumentTypes.filter((item): item is string => typeof item === 'string')
        : typeof metadata.documentType === 'string'
          ? [metadata.documentType]
          : [];

      checklist = this.checklistService.evaluate({
        proceduralType: typeof metadata.proceduralType === 'string' ? metadata.proceduralType : null,
        providedDocumentTypes,
      });

      if (!checklist.complete) {
        throw new CrmContractError('Checklist documental pendente para aprovação', 409, 'DOCUMENT_CHECKLIST_INCOMPLETE', {
          documentId: normalized.documentId,
          missingItems: checklist.missingItems,
        });
      }
    }

    return this.repository.saveDecision({
      documentId: normalized.documentId,
      decision: normalized.decision,
      status: normalized.decision === 'approved' ? 'validado' : 'rejeitado',
      reason: normalized.reason,
      actor: normalized.actor,
      checklist,
    });
  }
}
