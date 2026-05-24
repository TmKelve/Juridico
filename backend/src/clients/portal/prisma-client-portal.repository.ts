import type {
  ClientPortalDeadlineCard,
  ClientPortalDocumentCard,
  ClientPortalPublicationCard,
  ClientPortalRepository,
  PortalClientRecord,
} from './client-portal.types';

type RecordMap = Record<string, unknown>;

function toClient(row: RecordMap | null | undefined): PortalClientRecord | null {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: String(row.name),
    status: String(row.status),
  };
}

function toDocumentCard(row: RecordMap): ClientPortalDocumentCard {
  return {
    documentId: Number(row.id),
    processId: Number(row.processId),
    title: String(row.title),
    status: String(row.status),
    category: String(row.category),
    uploadedAt: new Date(String(row.uploadedAt)).toISOString(),
  };
}

function toPublicationCard(row: RecordMap): ClientPortalPublicationCard {
  return {
    publicationId: Number(row.id),
    processId: Number(row.processId),
    title: String(row.summary),
    status: String(row.status),
    publishedAt: new Date(String(row.publishedAt)).toISOString(),
    requiresAction: Boolean(row.requiresAction),
  };
}

function toDeadlineCard(row: RecordMap): ClientPortalDeadlineCard {
  return {
    deadlineId: Number(row.id),
    processId: Number(row.processId),
    title: String(row.title),
    status: String(row.status),
    dueDate: new Date(String(row.dueDate)).toISOString(),
    priority: String(row.priority),
  };
}

const closedProcessStatuses = ['encerrado', 'concluido', 'arquivado', 'finalizado'];

export function createPrismaClientPortalRepository(prisma: {
  client: {
    findUnique(args: { where: { id: number }; select: Record<string, boolean> }): Promise<RecordMap | null>;
  };
  process: { count(args: { where: Record<string, unknown> }): Promise<number> };
  documento: {
    count(args: { where: Record<string, unknown> }): Promise<number>;
    findMany(args: { where: Record<string, unknown>; orderBy: Record<string, unknown>; take: number; select: Record<string, boolean> }): Promise<RecordMap[]>;
  };
  publication: {
    count(args: { where: Record<string, unknown> }): Promise<number>;
    findMany(args: { where: Record<string, unknown>; orderBy: Record<string, unknown>; take: number; select: Record<string, boolean> }): Promise<RecordMap[]>;
  };
  prazo: {
    findMany(args: { where: Record<string, unknown>; orderBy: Record<string, unknown>; take: number; select: Record<string, boolean> }): Promise<RecordMap[]>;
  };
}): ClientPortalRepository {
  return {
    async findClientById(clientId) {
      return toClient(await prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, name: true, status: true },
      }));
    },

    async countActiveProcesses(clientId) {
      return prisma.process.count({
        where: {
          clientId,
          status: { notIn: closedProcessStatuses },
        },
      });
    },

    async countPendingDocuments(clientId) {
      return prisma.documento.count({
        where: {
          process: { clientId },
          OR: [
            { status: { not: 'validado' } },
            { pendingForAdvance: true },
          ],
        },
      });
    },

    async countRecentPublications(clientId) {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - 30);

      return prisma.publication.count({
        where: {
          OR: [
            { clientId },
            { process: { clientId } },
          ],
          publishedAt: { gte: threshold },
        },
      });
    },

    async listDocumentCards(clientId) {
      const rows = await prisma.documento.findMany({
        where: { process: { clientId } },
        orderBy: { uploadedAt: 'desc' },
        take: 6,
        select: {
          id: true,
          processId: true,
          title: true,
          status: true,
          category: true,
          uploadedAt: true,
        },
      });

      return rows.map(toDocumentCard);
    },

    async listPublicationCards(clientId) {
      const rows = await prisma.publication.findMany({
        where: {
          OR: [
            { clientId },
            { process: { clientId } },
          ],
        },
        orderBy: { publishedAt: 'desc' },
        take: 6,
        select: {
          id: true,
          processId: true,
          summary: true,
          status: true,
          publishedAt: true,
          requiresAction: true,
        },
      });

      return rows.map(toPublicationCard);
    },

    async listDeadlineCards(clientId) {
      const rows = await prisma.prazo.findMany({
        where: {
          process: { clientId },
          status: { not: 'concluido' },
        },
        orderBy: { dueDate: 'asc' },
        take: 6,
        select: {
          id: true,
          processId: true,
          title: true,
          status: true,
          dueDate: true,
          priority: true,
        },
      });

      return rows.map(toDeadlineCard);
    },
  };
}
