import { randomUUID } from 'crypto';
import type { DocumentUploadMetadata, StoredDocumentFile } from '../upload';
import type {
  DocumentArtifactsRepository,
  PersistedArtifactDocument,
  PersistedArtifactRecord,
} from './document-artifacts.types';

interface ProcessDelegate {
  findUnique(args: { where: { id: number } }): Promise<Record<string, unknown> | null>;
}

interface DocumentDelegate {
  create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
}

interface AuditEventDelegate {
  create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
}

function normalizeStorage(row: Record<string, unknown>): StoredDocumentFile {
  return {
    storageKey: String(row.storageKey),
    mimeType: String(row.mimeType),
    sizeInBytes: Number(row.sizeInBytes ?? 0),
    checksum: row.checksum ? String(row.checksum) : null,
    previewUrl: row.previewUrl ? String(row.previewUrl) : null,
  };
}

export class InMemoryDocumentArtifactsRepository implements DocumentArtifactsRepository {
  private readonly processes = new Set<number>();
  private readonly artifacts = new Map<string, PersistedArtifactRecord>();
  private nextDocumentId = 1000;

  seedProcess(processId: number) {
    this.processes.add(processId);
  }

  async assertProcessExists(processId: number) {
    return this.processes.has(processId);
  }

  async saveArtifactRecord(input: {
    templateId: string;
    processId: number;
    documentTitle: string;
    payloadChecksum: string;
    storage: StoredDocumentFile;
    documentId: number | null;
    generatedAt: string;
    metadata: DocumentUploadMetadata;
  }) {
    const record: PersistedArtifactRecord = {
      artifactId: `artifact_${randomUUID()}`,
      templateId: input.templateId,
      processId: input.processId,
      documentTitle: input.documentTitle,
      payloadChecksum: input.payloadChecksum,
      storage: input.storage,
      documentId: input.documentId,
      generatedAt: input.generatedAt,
      metadata: input.metadata,
    };

    this.artifacts.set(record.artifactId, record);
    return record;
  }

  async createDocument(input: {
    processId: number;
    title: string;
    category: string;
    status: string;
    origin: string;
    mimeType: string;
    previewUrl: string | null;
    createdBy: string | null;
    metadata: DocumentUploadMetadata;
    storage: StoredDocumentFile;
  }): Promise<PersistedArtifactDocument> {
    return {
      id: this.nextDocumentId++,
      processId: input.processId,
      title: input.title,
      version: 1,
      isLatestVersion: true,
      status: input.status,
      category: input.category,
      metadata: input.metadata,
      storage: input.storage,
    };
  }
}

export function createPrismaDocumentArtifactsRepository(dependencies: {
  process: ProcessDelegate;
  auditEvent: AuditEventDelegate;
  document?: DocumentDelegate;
}): DocumentArtifactsRepository {
  return {
    async assertProcessExists(processId: number) {
      const row = await dependencies.process.findUnique({ where: { id: processId } });
      return Boolean(row);
    },

    async saveArtifactRecord(input) {
      const created = await dependencies.auditEvent.create({
        data: {
          id: `doc_artifact_${randomUUID()}`,
          scope: 'documents.artifact.sidecar',
          entityType: 'crm_opportunity_document',
          entityId: input.documentId ?? input.processId,
          action: 'document.artifact.generate',
          status: 'success',
          summary: `Artefato ${input.documentTitle} persistido`,
          details: {
            artifactId: `artifact_${randomUUID()}`,
            templateId: input.templateId,
            processId: input.processId,
            documentTitle: input.documentTitle,
            payloadChecksum: input.payloadChecksum,
            documentId: input.documentId,
            storage: input.storage,
            metadata: input.metadata,
          },
          actor: { source: 'system' },
          occurredAt: input.generatedAt,
          correlationId: null,
          idempotencyKey: null,
          createdAt: input.generatedAt,
        },
      });

      const details = (created.details ?? {}) as Record<string, unknown>;
      return {
        artifactId: String(details.artifactId),
        templateId: String(details.templateId),
        processId: Number(details.processId),
        documentTitle: String(details.documentTitle),
        payloadChecksum: String(details.payloadChecksum),
        storage: normalizeStorage(details.storage as Record<string, unknown>),
        documentId: details.documentId === null || details.documentId === undefined ? null : Number(details.documentId),
        generatedAt: new Date(String(created.occurredAt)).toISOString(),
        metadata: (details.metadata as DocumentUploadMetadata) ?? {},
      };
    },

    async createDocument(input) {
      if (!dependencies.document) {
        throw new Error('Document delegate is required to persist artifacts as documents.');
      }

      const created = await dependencies.document.create({
        data: {
          processId: input.processId,
          title: input.title,
          description: 'Artefato gerado automaticamente',
          category: input.category,
          status: input.status,
          version: 1,
          isLatestVersion: true,
          origin: input.origin,
          responsible: input.createdBy,
          requiredChecklist: false,
          pendingForAdvance: false,
          mimeType: input.mimeType,
          previewUrl: input.previewUrl,
          metadata: input.metadata,
          storage: input.storage,
        },
      });

      return {
        id: Number(created.id),
        processId: Number(created.processId),
        title: String(created.title),
        version: Number(created.version ?? 1),
        isLatestVersion: Boolean(created.isLatestVersion ?? true),
        status: String(created.status),
        category: String(created.category),
        metadata: (created.metadata as DocumentUploadMetadata) ?? {},
        storage: normalizeStorage(created.storage as Record<string, unknown>),
      };
    },
  };
}
