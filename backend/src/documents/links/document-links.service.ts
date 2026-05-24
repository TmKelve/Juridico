import { CrmContractError } from '../../crm/audit';
import { type DocumentAuditService } from '../audit';
import type {
  DocumentEntityLink,
  DocumentLinkAuditPort,
  DocumentLinkBindResult,
  DocumentLinksIdempotencyPort,
  DocumentLinksRepository,
} from './document-links.types';
import { mergeDocumentLinks, normalizeDocumentLinkBindInput } from './document-links.validators';

function serializeActor(actor: DocumentEntityLink['boundBy']) {
  return {
    source: actor.source,
    userId: actor.userId ?? null,
    email: actor.email ?? null,
    role: actor.role ?? null,
  };
}

export class DocumentLinksService {
  constructor(
    private readonly repository: DocumentLinksRepository,
    private readonly dependencies: {
      auditService?: DocumentLinkAuditPort | DocumentAuditService;
      idempotencyService?: DocumentLinksIdempotencyPort;
    } = {},
  ) {}

  async bindEntities(input: Parameters<typeof normalizeDocumentLinkBindInput>[0]): Promise<DocumentLinkBindResult> {
    const normalized = normalizeDocumentLinkBindInput(input);
    const document = await this.repository.findDocumentById(normalized.documentId);
    if (!document) {
      throw new CrmContractError('Documento não encontrado', 404, 'DOCUMENT_NOT_FOUND', {
        documentId: normalized.documentId,
      });
    }

    const execute = async () => {
      for (const target of normalized.targets) {
        const exists = await this.repository.assertEntityExists(target);
        if (!exists) {
          throw new CrmContractError('Entidade alvo não encontrada para vínculo documental', 404, 'DOCUMENT_LINK_NOT_FOUND', {
            entityType: target.entityType,
            entityId: target.entityId,
          });
        }
      }

      const existingLinks = await this.repository.listLinks(normalized.documentId);
      const createdLinks: DocumentEntityLink[] = normalized.targets.map((target) => ({
        entityType: target.entityType,
        entityId: target.entityId,
        boundAt: normalized.occurredAt,
        boundBy: normalized.actor,
      }));

      const links = await this.repository.saveLinks({
        documentId: normalized.documentId,
        links: mergeDocumentLinks(existingLinks, createdLinks),
      });

      const auditEvents = [];
      if (this.dependencies.auditService) {
        for (const target of createdLinks) {
          auditEvents.push(
            await this.dependencies.auditService.record({
              eventType: 'document_linked',
              entityType: 'document_link',
              entityId: target.entityId,
              documentId: normalized.documentId,
              processId: document.processId ?? null,
              status: 'success',
              summary: `Documento #${normalized.documentId} vinculado a ${target.entityType} #${target.entityId}`,
              details: {
                entityType: target.entityType,
                entityId: target.entityId,
                links: links.map((item) => ({
                  entityType: item.entityType,
                  entityId: item.entityId,
                  boundAt: item.boundAt,
                  boundBy: serializeActor(item.boundBy),
                })),
              },
              actor: normalized.actor,
              correlationId: normalized.correlationId,
              idempotencyKey: normalized.idempotencyKey,
              occurredAt: normalized.occurredAt,
            }),
          );
        }
      }

      return {
        documentId: normalized.documentId,
        links,
        idempotent: false,
        auditEvents,
      };
    };

    if (!this.dependencies.idempotencyService) {
      return execute();
    }

    const response = await this.dependencies.idempotencyService.runIdempotent({
      key: normalized.idempotencyKey,
      scope: 'documents.link.bindEntities',
      entityType: 'crm_opportunity_document',
      entityId: normalized.documentId,
      action: 'document.link.bindEntities',
      payload: normalized,
      execute,
      onConflictMessage: 'idempotencyKey já foi usado em outro vínculo documental',
    });

    return {
      ...response.data,
      idempotent: response.mode === 'replayed',
    };
  }
}
