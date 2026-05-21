import type {
  OpportunityAttachedDocument,
  OpportunityDocumentContext,
  OpportunityDocumentsRepository,
} from './opportunity-documents.types';

interface CrmOpportunityDelegate {
  findUnique(args: { where: { id: number }; select: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
}

interface DocumentoDelegate {
  create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
}

interface OpportunityDocumentAttachmentDelegate {
  create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
}

function toOpportunityContext(row: Record<string, unknown>): OpportunityDocumentContext {
  return {
    id: Number(row.id),
    status: String(row.status),
    responsible: row.responsible ? String(row.responsible) : null,
    convertedProcessId: row.convertedProcessId === null || row.convertedProcessId === undefined ? null : Number(row.convertedProcessId),
  };
}

function toAttachedDocument(row: Record<string, unknown>, opportunityId: number): OpportunityAttachedDocument {
  return {
    attachmentId: Number(row.id),
    opportunityId,
    documentId: Number(row.documentId),
    title: String(row.title),
    category: String(row.category),
    status: String(row.status),
    mimeType: String(row.mimeType),
    previewUrl: row.previewUrl ? String(row.previewUrl) : null,
    requiredChecklist: Boolean(row.requiredChecklist),
    pendingForAdvance: Boolean(row.pendingForAdvance),
    uploadedAt: new Date(String(row.uploadedAt)).toISOString(),
    responsible: row.responsible ? String(row.responsible) : null,
    createdBy: row.createdBy ? String(row.createdBy) : null,
    externalDocumentId: row.externalDocumentId ? String(row.externalDocumentId) : null,
  };
}

export function createPrismaOpportunityDocumentsRepository(dependencies: {
  crmOpportunity: CrmOpportunityDelegate;
  documento: DocumentoDelegate;
  crmOpportunityDocumentAttachment: OpportunityDocumentAttachmentDelegate;
}): OpportunityDocumentsRepository {
  return {
    async findOpportunityById(opportunityId) {
      const row = await dependencies.crmOpportunity.findUnique({
        where: { id: opportunityId },
        select: {
          id: true,
          status: true,
          responsible: true,
          convertedProcessId: true,
        },
      });

      return row ? toOpportunityContext(row) : null;
    },

    async attachDocumentToOpportunity(input) {
      const createdDocument = input.processId
        ? await dependencies.documento.create({
            data: {
              processId: input.processId,
              title: input.title,
              description: input.description,
              status: 'anexado',
              category: input.category,
              origin: input.origin,
              uploadedAt: input.uploadedAt,
              responsible: input.responsible,
              requiredChecklist: input.requiredChecklist,
              pendingForAdvance: input.pendingForAdvance,
              mimeType: input.mimeType,
              previewUrl: input.previewUrl,
              createdBy: input.createdBy,
            },
          })
        : null;

      const createdAttachment = await dependencies.crmOpportunityDocumentAttachment.create({
        data: {
          crmOpportunityId: input.opportunityId,
          documentId: createdDocument?.id ?? null,
          titleSnapshot: input.title,
          category: input.category,
          status: 'ativo',
          mimeType: input.mimeType,
          previewUrl: input.previewUrl,
          requiredChecklist: input.requiredChecklist,
          pendingForAdvance: input.pendingForAdvance,
          uploadedAt: input.uploadedAt,
          responsible: input.responsible,
          createdBy: input.createdBy,
          externalDocumentId: input.externalDocumentId,
          metadata: input.metadata,
        },
      });

      return toAttachedDocument(
        {
          id: createdAttachment.id,
          documentId: createdDocument?.id ?? null,
          title: input.title,
          category: input.category,
          status: 'ativo',
          mimeType: input.mimeType,
          previewUrl: input.previewUrl,
          requiredChecklist: input.requiredChecklist,
          pendingForAdvance: input.pendingForAdvance,
          uploadedAt: input.uploadedAt,
          responsible: input.responsible,
          createdBy: input.createdBy,
          externalDocumentId: input.externalDocumentId,
        },
        input.opportunityId,
      );
    },
  };
}
