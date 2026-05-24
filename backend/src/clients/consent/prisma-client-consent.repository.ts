import type { ClientConsentClientRecord, ClientConsentRepository, ClientConsentSnapshot } from './client-consent.types';

type RecordMap = Record<string, unknown>;

function toClient(row: RecordMap | null | undefined): ClientConsentClientRecord | null {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: String(row.name),
    status: String(row.status),
  };
}

function toConsentSnapshot(row: RecordMap | null | undefined): ClientConsentSnapshot | null {
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

export function createPrismaClientConsentRepository(prisma: {
  client: {
    findUnique(args: { where: { id: number }; select: Record<string, boolean> }): Promise<RecordMap | null>;
  };
  crmAuditEvent: {
    findMany(args: { where: Record<string, unknown>; orderBy: Record<string, unknown>; take: number }): Promise<RecordMap[]>;
  };
}): ClientConsentRepository {
  return {
    async findClientById(clientId) {
      return toClient(await prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, name: true, status: true },
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

      return toConsentSnapshot(rows[0]);
    },
  };
}
