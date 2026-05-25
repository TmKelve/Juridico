import type { CrmAuditActor } from '../../crm/audit';
import type {
  DocumentEntityLink,
  DocumentLinkEntityType,
  DocumentLinkTargetCheck,
  DocumentLinksDocumentRecord,
  DocumentLinksRepository,
} from './document-links.types';

interface DocumentDelegate {
  findUnique(args: { where: { id: number } }): Promise<Record<string, unknown> | null>;
  update?(args: { where: { id: number }; data: Record<string, unknown> }): Promise<Record<string, unknown>>;
}

interface EntityLookupDelegate {
  findUnique(args: { where: { id: number } }): Promise<Record<string, unknown> | null>;
}

interface AuditEventDelegate {
  findMany(args: {
    where: Record<string, unknown>;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<Array<Record<string, unknown>>>;
  create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
}

function normalizeActor(value: unknown): CrmAuditActor {
  const actor = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    source: actor.source === 'user' || actor.source === 'api' ? actor.source : 'system',
    userId: typeof actor.userId === 'number' ? actor.userId : null,
    email: typeof actor.email === 'string' ? actor.email : null,
    role: typeof actor.role === 'string' ? actor.role : null,
  };
}

function readLinksFromMetadata(metadata: unknown): DocumentEntityLink[] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return [];
  const sidecar = (metadata as Record<string, unknown>).documentLinksSidecar;
  if (!Array.isArray(sidecar)) return [];

  return sidecar.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const entityType = record.entityType;
    const entityId = Number(record.entityId);
    const boundAt = typeof record.boundAt === 'string' ? record.boundAt : null;
    if (
      (entityType !== 'process' && entityType !== 'deadline' && entityType !== 'attendance' && entityType !== 'triage_item' && entityType !== 'crm_opportunity')
      || !Number.isInteger(entityId)
      || !boundAt
    ) {
      return [];
    }

    return [{
      entityType: entityType as DocumentLinkEntityType,
      entityId,
      boundAt,
      boundBy: normalizeActor(record.boundBy),
    }];
  });
}

function writeLinksToMetadata(metadata: unknown, links: DocumentEntityLink[]) {
  const current = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? { ...(metadata as Record<string, unknown>) }
    : {};

  current.documentLinksSidecar = links.map((link) => ({
    entityType: link.entityType,
    entityId: link.entityId,
    boundAt: link.boundAt,
    boundBy: link.boundBy,
  }));

  return current;
}

function serializeLinks(links: DocumentEntityLink[]) {
  return links.map((link) => ({
    entityType: link.entityType,
    entityId: link.entityId,
    boundAt: link.boundAt,
    boundBy: link.boundBy,
  }));
}

function readLinksFromAuditEvents(rows: Array<Record<string, unknown>>): DocumentEntityLink[] {
  let latest: DocumentEntityLink[] = [];
  for (const row of rows) {
    const details = row.details;
    if (!details || typeof details !== 'object' || Array.isArray(details)) continue;
    const links = readLinksFromMetadata({ documentLinksSidecar: (details as Record<string, unknown>).links });
    if (links.length > 0) {
      latest = links;
    }
  }

  return latest;
}

export class InMemoryDocumentLinksRepository implements DocumentLinksRepository {
  private readonly documents = new Map<number, DocumentLinksDocumentRecord>();
  private readonly links = new Map<number, DocumentEntityLink[]>();
  private readonly existingTargets = new Set<string>();

  seedDocument(document: DocumentLinksDocumentRecord) {
    this.documents.set(document.id, document);
  }

  seedTarget(target: DocumentLinkTargetCheck) {
    this.existingTargets.add(`${target.entityType}:${target.entityId}`);
  }

  async findDocumentById(documentId: number) {
    return this.documents.get(documentId) ?? null;
  }

  async assertEntityExists(target: DocumentLinkTargetCheck) {
    return this.existingTargets.has(`${target.entityType}:${target.entityId}`);
  }

  async listLinks(documentId: number) {
    return this.links.get(documentId) ?? [];
  }

  async saveLinks(input: { documentId: number; links: DocumentEntityLink[] }) {
    this.links.set(input.documentId, input.links);
    return input.links;
  }
}

export function createPrismaDocumentLinksRepository(dependencies: {
  document: DocumentDelegate;
  process?: EntityLookupDelegate;
  deadline?: EntityLookupDelegate;
  attendance?: EntityLookupDelegate;
  triageItem?: EntityLookupDelegate;
  crmOpportunity?: EntityLookupDelegate;
  auditEvent?: AuditEventDelegate;
}): DocumentLinksRepository {
  const lookups: Record<DocumentLinkEntityType, EntityLookupDelegate | undefined> = {
    process: dependencies.process,
    deadline: dependencies.deadline,
    attendance: dependencies.attendance,
    triage_item: dependencies.triageItem,
    crm_opportunity: dependencies.crmOpportunity,
  };

  return {
    async findDocumentById(documentId: number) {
      const row = await dependencies.document.findUnique({ where: { id: documentId } });
      if (!row) return null;

      return {
        id: Number(row.id),
        processId: row.processId === null || row.processId === undefined ? null : Number(row.processId),
        metadata: row.metadata && typeof row.metadata === 'object' ? (row.metadata as Record<string, unknown>) : null,
      };
    },

    async assertEntityExists(target: DocumentLinkTargetCheck) {
      const delegate = lookups[target.entityType];
      if (!delegate) return false;
      const row = await delegate.findUnique({ where: { id: target.entityId } });
      return Boolean(row);
    },

    async listLinks(documentId: number) {
      if (dependencies.auditEvent) {
        const rows = await dependencies.auditEvent.findMany({
          where: {
            scope: 'documents',
            entityType: 'crm_opportunity_document',
            entityId: documentId,
            action: 'document.link.bindEntities',
          },
          orderBy: { occurredAt: 'desc' },
        });
        return readLinksFromAuditEvents(rows);
      }

      const row = await dependencies.document.findUnique({ where: { id: documentId } });
      return readLinksFromMetadata(row?.metadata);
    },

    async saveLinks(input) {
      if (dependencies.auditEvent) {
        const document = await dependencies.document.findUnique({ where: { id: input.documentId } });
        await dependencies.auditEvent.create({
          data: {
            id: `doc_link_${input.documentId}_${Date.now()}`,
            scope: 'documents',
            entityType: 'crm_opportunity_document',
            entityId: input.documentId,
            action: 'document.link.bindEntities',
            status: 'success',
            summary: `Vínculos do documento #${input.documentId} atualizados`,
            details: {
              documentId: input.documentId,
              processId: document?.processId === null || document?.processId === undefined ? null : Number(document.processId),
              links: serializeLinks(input.links),
            },
            actor: { source: 'system' },
            occurredAt: input.links[0]?.boundAt ?? new Date().toISOString(),
            correlationId: null,
            idempotencyKey: null,
            createdAt: new Date().toISOString(),
          },
        });
        return input.links;
      }

      const row = await dependencies.document.findUnique({ where: { id: input.documentId } });
      const metadata = writeLinksToMetadata(row?.metadata, input.links);
      if (!dependencies.document.update) {
        throw new Error('Document update delegate is required for metadata-backed link persistence.');
      }
      await dependencies.document.update({
        where: { id: input.documentId },
        data: { metadata },
      });

      return input.links;
    },
  };
}
