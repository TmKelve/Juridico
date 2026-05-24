import { randomUUID } from 'crypto';
import { CrmContractError } from '../../crm/audit';
import { type DocumentAuditService } from '../audit';
import type {
  DocumentArtifactAuditPort,
  DocumentArtifactGenerateResult,
  DocumentArtifactsIdempotencyPort,
  DocumentArtifactsRepository,
  DocumentArtifactGenerator,
  DocumentArtifactStorageAdapter,
} from './document-artifacts.types';
import { normalizeDocumentArtifactGenerateInput } from './document-artifacts.validators';

export class DocumentArtifactsService {
  constructor(
    private readonly generator: DocumentArtifactGenerator,
    private readonly storageAdapter: DocumentArtifactStorageAdapter,
    private readonly repository: DocumentArtifactsRepository,
    private readonly dependencies: {
      auditService?: DocumentArtifactAuditPort | DocumentAuditService;
      idempotencyService?: DocumentArtifactsIdempotencyPort;
    } = {},
  ) {}

  async generate(input: Parameters<typeof normalizeDocumentArtifactGenerateInput>[0]): Promise<DocumentArtifactGenerateResult> {
    const normalized = normalizeDocumentArtifactGenerateInput(input);
    const exists = await this.repository.assertProcessExists(normalized.processId);
    if (!exists) {
      throw new CrmContractError('Processo não encontrado', 404, 'DOCUMENT_PROCESS_REQUIRED', {
        processId: normalized.processId,
      });
    }

    const execute = async () => {
      const generatedAt = normalized.occurredAt;
      const artifactId = randomUUID();
      const output = await this.generator.generate({
        templateId: normalized.templateId,
        processId: normalized.processId,
        documentTitle: normalized.documentTitle,
        payload: normalized.payload,
      });

      const metadata = {
        artifactId,
        templateId: normalized.templateId,
        payloadChecksum: normalized.payloadChecksum,
        generatedAt,
        ...(output.metadata ?? {}),
      };

      const storage = await this.storageAdapter.store({
        processId: normalized.processId,
        fileName: output.fileName,
        mimeType: output.mimeType,
        contentBase64: output.contentBase64,
        metadata,
      });

      let documentId: number | null = null;
      if (normalized.persistAsDocument) {
        if (!this.repository.createDocument) {
          throw new CrmContractError(
            'Persistência como documento não está disponível neste adapter',
            500,
            'DOCUMENT_ARTIFACT_FAILED',
          );
        }

        const document = await this.repository.createDocument({
          processId: normalized.processId,
          title: normalized.documentTitle,
          category: normalized.category,
          status: 'gerado',
          origin: normalized.origin,
          mimeType: storage.mimeType,
          previewUrl: output.previewUrl ?? storage.previewUrl ?? null,
          createdBy: normalized.createdBy,
          metadata,
          storage,
        });
        documentId = document.id;
      }

      const record = await this.repository.saveArtifactRecord({
        templateId: normalized.templateId,
        processId: normalized.processId,
        documentTitle: normalized.documentTitle,
        payloadChecksum: normalized.payloadChecksum,
        storage,
        documentId,
        generatedAt,
        metadata,
      });

      const auditEvent = this.dependencies.auditService
        ? await this.dependencies.auditService.record({
            eventType: 'document_artifact_generated',
            entityType: 'document_artifact',
            entityId: Number.parseInt(record.artifactId.replace(/[^0-9]/g, '').slice(0, 9) || '0', 10),
            documentId,
            processId: normalized.processId,
            status: 'success',
            summary: `Artefato ${normalized.documentTitle} gerado para o processo #${normalized.processId}`,
            details: {
              artifactId: record.artifactId,
              templateId: record.templateId,
              payloadChecksum: record.payloadChecksum,
              storageKey: record.storage.storageKey,
              documentId,
            },
            actor: normalized.actor,
            correlationId: normalized.correlationId,
            idempotencyKey: normalized.idempotencyKey,
            occurredAt: generatedAt,
          })
        : null;

      return {
        artifactId: record.artifactId,
        documentId,
        storageKey: record.storage.storageKey,
        checksum: record.storage.checksum ?? normalized.payloadChecksum,
        generatedAt,
        idempotent: false,
        auditEvent,
      };
    };

    if (!this.dependencies.idempotencyService) {
      return execute();
    }

    const response = await this.dependencies.idempotencyService.runIdempotent({
      key: normalized.idempotencyKey,
      scope: 'documents.artifact.generate',
      entityType: 'crm_opportunity_document',
      entityId: normalized.processId,
      action: 'document.artifact.generate',
      payload: normalized,
      execute,
      onConflictMessage: 'idempotencyKey já foi usado em outra geração de artefato documental',
    });

    return {
      ...response.data,
      idempotent: response.mode === 'replayed',
    };
  }
}
