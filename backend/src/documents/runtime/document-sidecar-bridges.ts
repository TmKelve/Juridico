import type { CrmAuditActor } from '../../crm/audit';
import type {
  DocumentEntityLink,
  DocumentLinkEntityType,
  DocumentLinksRepository,
} from '../links/document-links.types';
import type {
  DocumentArtifactsRepository,
  PersistedArtifactRecord,
} from '../artifacts/document-artifacts.types';
import type { DocumentUploadMetadata, StoredDocumentFile } from '../upload';

type LinkAuditEvent = {
  action: string;
  details?: Record<string, unknown>;
};

function normalizeActor(value: unknown): CrmAuditActor {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { source: 'system', userId: null, email: null, role: null };
  }

  const actor = value as Record<string, unknown>;
  return {
    source: actor.source === 'user' || actor.source === 'api' ? actor.source : 'system',
    userId: typeof actor.userId === 'number' ? actor.userId : null,
    email: typeof actor.email === 'string' ? actor.email : null,
    role: typeof actor.role === 'string' ? actor.role : null,
  };
}

function normalizeLink(value: unknown): DocumentEntityLink | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const entityType = raw.entityType;
  const entityId = Number(raw.entityId);
  const boundAt = typeof raw.boundAt === 'string' ? raw.boundAt : null;
  if (
    (entityType !== 'process' && entityType !== 'deadline' && entityType !== 'attendance' && entityType !== 'triage_item' && entityType !== 'crm_opportunity')
    || !Number.isInteger(entityId)
    || entityId <= 0
    || !boundAt
  ) {
    return null;
  }

  return {
    entityType: entityType as DocumentLinkEntityType,
    entityId,
    boundAt,
    boundBy: normalizeActor(raw.boundBy),
  };
}

function readLatestLinkSnapshot(events: LinkAuditEvent[]) {
  let snapshot: DocumentEntityLink[] = [];

  for (const event of events) {
    if (event.action !== 'document.link.bindEntities') continue;
    const links = Array.isArray(event.details?.links) ? event.details?.links : [];
    snapshot = links.map((item) => normalizeLink(item)).filter((item): item is DocumentEntityLink => Boolean(item));
  }

  return snapshot;
}

export function createAuditBackedDocumentLinksRepository(dependencies: {
  findDocumentById: (documentId: number) => Promise<{ id: number; processId?: number | null } | null>;
  listAuditTrail: (documentId: number) => Promise<LinkAuditEvent[]>;
  entityLookup: (entityType: DocumentLinkEntityType, entityId: number) => Promise<boolean>;
}): DocumentLinksRepository {
  return {
    async findDocumentById(documentId) {
      const row = await dependencies.findDocumentById(documentId);
      return row ? { id: row.id, processId: row.processId ?? null, metadata: null } : null;
    },

    async assertEntityExists(target) {
      return dependencies.entityLookup(target.entityType, target.entityId);
    },

    async listLinks(documentId) {
      return readLatestLinkSnapshot(await dependencies.listAuditTrail(documentId));
    },

    async saveLinks(input) {
      return input.links;
    },
  };
}

export function createAuditBackedDocumentArtifactsRepository(dependencies: {
  assertProcessExists: (processId: number) => Promise<boolean>;
  createDocumentRow?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
}): DocumentArtifactsRepository {
  return {
    async assertProcessExists(processId) {
      return dependencies.assertProcessExists(processId);
    },

    async saveArtifactRecord(input): Promise<PersistedArtifactRecord> {
      return {
        artifactId: `artifact_${Date.now().toString(16)}`,
        templateId: input.templateId,
        processId: input.processId,
        documentTitle: input.documentTitle,
        payloadChecksum: input.payloadChecksum,
        storage: input.storage,
        documentId: input.documentId,
        generatedAt: input.generatedAt,
        metadata: input.metadata,
      };
    },

    async createDocument(input) {
      if (!dependencies.createDocumentRow) {
        throw new Error('Document delegate is required to persist artifacts as documents.');
      }

      const created = await dependencies.createDocumentRow({
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
      });

      return {
        id: Number(created.id),
        processId: Number(created.processId),
        title: String(created.title),
        version: Number(created.version ?? 1),
        isLatestVersion: Boolean(created.isLatestVersion ?? true),
        status: String(created.status),
        category: String(created.category),
        metadata: input.metadata as DocumentUploadMetadata,
        storage: input.storage as StoredDocumentFile,
      };
    },
  };
}
