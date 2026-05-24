import type { ClientConsentSnapshot } from '../clients/consent';
import type {
  ClientCommunicationHistoryItem,
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
  };
}

export function createPrismaCommunicationRepository(prisma: {
  client: {
    findUnique(args: { where: { id: number }; select: Record<string, boolean> }): Promise<RecordMap | null>;
  };
  crmAuditEvent: {
    findMany(args: { where: Record<string, unknown>; orderBy: Record<string, unknown>; take: number }): Promise<RecordMap[]>;
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

    async listCommunicationHistory(clientId, channel, limit) {
      const rows = await prisma.crmAuditEvent.findMany({
        where: {
          scope: 'communication',
          action: 'client.communication.send',
          entityId: clientId,
        },
        orderBy: { occurredAt: 'desc' },
        take: limit,
      });

      return rows
        .map(toHistoryItem)
        .filter((item) => channel === 'all' || item.channel === channel);
    },
  };
}
