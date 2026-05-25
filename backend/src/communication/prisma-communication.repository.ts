import type { ClientConsentSnapshot } from '../clients/consent';
import type {
  ClientCommunicationHistoryItem,
  CommunicationRecord,
  CommunicationClientRecord,
  CommunicationHistoryChannel,
  CommunicationRepository,
} from './communication.types';

type RecordMap = Record<string, unknown>;

function toClient(row: RecordMap | null | undefined): CommunicationClientRecord | null {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: String(row.name),
    status: String(row.status),
    email: row.email ? String(row.email) : null,
    phone: row.phone ? String(row.phone) : null,
  };
}

function toConsent(row: RecordMap | null | undefined): ClientConsentSnapshot | null {
  if (!row) return null;
  const details = (row.details as RecordMap | undefined) ?? {};
  const preferences = (details.preferences as RecordMap | undefined) ?? {};
  return {
    clientId: Number(details.clientId ?? row.entityId),
    consentVersion: Number(details.consentVersion ?? 1),
    preferences: {
      email: Boolean(preferences.email),
      whatsapp: Boolean(preferences.whatsapp),
      portal: Boolean(preferences.portal),
    },
    legalBasis: String(details.legalBasis ?? 'consentimento') as ClientConsentSnapshot['legalBasis'],
    capturedAt: String(details.capturedAt ?? row.occurredAt),
    capturedBy: String(details.capturedBy ?? ''),
    updatedAt: String(details.updatedAt ?? row.createdAt),
  };
}

function toHistoryItem(row: RecordMap): ClientCommunicationHistoryItem {
  const details = (row.details as RecordMap | undefined) ?? {};
  return {
    clientId: Number(details.clientId ?? row.entityId),
    communicationId: String(details.communicationId ?? row.id),
    channel: String(details.channel ?? 'portal') as ClientCommunicationHistoryItem['channel'],
    status: String(details.deliveryStatus ?? 'queued') as ClientCommunicationHistoryItem['status'],
    sentAt: details.sentAt ? String(details.sentAt) : null,
    deliveredAt: details.deliveredAt ? String(details.deliveredAt) : null,
    summary: String(details.message ?? row.summary),
    retryCount: typeof details.retryCount === 'number' ? details.retryCount : 0,
    attemptKind: String(details.attemptKind ?? 'send') as ClientCommunicationHistoryItem['attemptKind'],
    providerMessageId: typeof details.providerMessageId === 'string' ? details.providerMessageId : null,
    failureMessage: typeof details.failureMessage === 'string' ? details.failureMessage : null,
  };
}

function toCommunicationRecord(row: RecordMap): CommunicationRecord {
  const item = toHistoryItem(row);
  const details = (row.details as RecordMap | undefined) ?? {};
  return {
    clientId: item.clientId,
    communicationId: item.communicationId,
    channel: item.channel,
    subject: typeof details.subject === 'string' ? details.subject : null,
    message: String(details.message ?? row.summary ?? ''),
    templateCode: typeof details.templateCode === 'string' ? details.templateCode : null,
    contextEntityType: String(details.contextEntityType ?? 'crm') as CommunicationRecord['contextEntityType'],
    contextEntityId: typeof details.contextEntityId === 'number' || typeof details.contextEntityId === 'string'
      ? details.contextEntityId
      : null,
    deliveryStatus: item.status,
    retryCount: item.retryCount,
    providerMessageId: item.providerMessageId,
    sentAt: item.sentAt,
    deliveredAt: item.deliveredAt,
    summary: item.summary,
    attemptKind: item.attemptKind,
    failureMessage: item.failureMessage,
  };
}

async function readCommunicationAuditRows(
  prisma: {
    crmAuditEvent: {
      findMany(args: { where: Record<string, unknown>; orderBy: Record<string, unknown>; take: number; skip?: number }): Promise<RecordMap[]>;
    };
  },
  clientId: number,
  take: number,
  skip = 0,
) {
  return prisma.crmAuditEvent.findMany({
    where: {
      scope: 'communication',
      action: { in: ['client.communication.send', 'client.communication.retry'] },
      entityId: clientId,
    },
    orderBy: { occurredAt: 'desc' },
    take,
    skip,
  });
}

export function createPrismaCommunicationRepository(prisma: {
  client: {
    findUnique(args: { where: { id: number }; select: Record<string, boolean> }): Promise<RecordMap | null>;
  };
  crmAuditEvent: {
    findMany(args: { where: Record<string, unknown>; orderBy: Record<string, unknown>; take: number; skip?: number }): Promise<RecordMap[]>;
  };
}): CommunicationRepository {
  return {
    async findClientById(clientId) {
      return toClient(await prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, name: true, status: true, email: true, phone: true },
      }));
    },

    async findLatestConsentByClientId(clientId) {
      const rows = await prisma.crmAuditEvent.findMany({
        where: {
          scope: 'clients',
          action: 'client.consent.update',
          entityId: clientId,
          status: 'success',
        },
        orderBy: { occurredAt: 'desc' },
        take: 1,
      });

      return toConsent(rows[0]);
    },

    async findCommunicationById(clientId, communicationId) {
      const pageSize = 100;
      let skip = 0;

      while (skip < 500) {
        const rows = await readCommunicationAuditRows(prisma, clientId, pageSize, skip);
        if (!rows.length) return null;

        const found = rows.find((row) => {
          const details = (row.details as RecordMap | undefined) ?? {};
          return String(details.communicationId ?? row.id) === communicationId;
        });

        if (found) {
          return toCommunicationRecord(found);
        }

        if (rows.length < pageSize) return null;
        skip += rows.length;
      }

      return null;
    },

    async listCommunicationHistory(clientId, channel, limit) {
      if (channel === 'all') {
        const rows = await readCommunicationAuditRows(prisma, clientId, limit);
        return rows.map(toHistoryItem);
      }

      const pageSize = Math.max(limit, 20);
      const items: ClientCommunicationHistoryItem[] = [];
      let skip = 0;

      while (items.length < limit && skip < 500) {
        const rows = await readCommunicationAuditRows(prisma, clientId, pageSize, skip);
        if (!rows.length) break;

        items.push(
          ...rows
            .map(toHistoryItem)
            .filter((item) => item.channel === channel),
        );

        if (rows.length < pageSize) break;
        skip += rows.length;
      }

      return items.slice(0, limit);
    },
  };
}
