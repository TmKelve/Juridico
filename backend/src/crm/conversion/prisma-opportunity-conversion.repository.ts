import type {
  CrmClientRecord,
  CrmOpportunityRecord,
  CrmProcessRecord,
} from '../opportunities/crm-opportunity.types';
import type {
  OpportunityConversionRepository,
  OpportunityConversionTransaction,
} from './opportunity-conversion.types';

type RecordMap = Record<string, unknown>;

function toClientRecord(row: RecordMap | null | undefined): CrmClientRecord | null {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: String(row.name),
    status: String(row.status),
    cpfCnpj: row.cpfCnpj ? String(row.cpfCnpj) : null,
    legalArea: row.legalArea ? String(row.legalArea) : null,
    responsible: row.responsible ? String(row.responsible) : null,
    type: row.type ? String(row.type) : null,
    notes: row.notes ? String(row.notes) : null,
  };
}

function toProcessRecord(row: RecordMap | null | undefined): CrmProcessRecord | null {
  if (!row) return null;
  return {
    id: Number(row.id),
    title: String(row.title),
    client: String(row.client),
    phase: String(row.phase),
    status: String(row.status),
    ownerId: Number(row.ownerId),
    processNumber: row.processNumber ? String(row.processNumber) : null,
    clientId: row.clientId === null || row.clientId === undefined ? null : Number(row.clientId),
    clientRecord: toClientRecord((row.clientRecord as RecordMap | null | undefined) ?? null),
  };
}

function toOpportunityRecord(row: RecordMap | null | undefined): CrmOpportunityRecord | null {
  if (!row) return null;
  const contactEvents = Array.isArray(row.contactEvents)
    ? row.contactEvents.map((event) => {
        const value = event as RecordMap;
        return {
          id: Number(value.id),
          kind: String(value.kind),
          summary: String(value.summary),
          createdBy: value.createdBy ? String(value.createdBy) : null,
          createdAt: new Date(String(value.createdAt)),
        };
      })
    : [];

  return {
    id: Number(row.id),
    clientId: row.clientId === null || row.clientId === undefined ? null : Number(row.clientId),
    convertedProcessId: row.convertedProcessId === null || row.convertedProcessId === undefined ? null : Number(row.convertedProcessId),
    cpf: row.cpf ? String(row.cpf) : null,
    personName: String(row.personName),
    source: String(row.source),
    status: String(row.status),
    responsible: row.responsible ? String(row.responsible) : null,
    summary: String(row.summary),
    lastContactAt: row.lastContactAt ? new Date(String(row.lastContactAt)) : null,
    nextContactAt: row.nextContactAt ? new Date(String(row.nextContactAt)) : null,
    createdAt: new Date(String(row.createdAt)),
    updatedAt: new Date(String(row.updatedAt)),
    clientRecord: toClientRecord((row.clientRecord as RecordMap | null | undefined) ?? null),
    contactEvents,
  };
}

export function createPrismaOpportunityConversionRepository(prisma: {
  crmOpportunity: any;
  process: any;
  client: any;
  $transaction: <T>(callback: (tx: any) => Promise<T>) => Promise<T>;
}): OpportunityConversionRepository {
  return {
    async findOpportunityById(id) {
      return toOpportunityRecord(await prisma.crmOpportunity.findUnique({
        where: { id },
        include: { clientRecord: true, contactEvents: { orderBy: { createdAt: 'desc' } } },
      }));
    },

    async findProcessByNumber(processNumber) {
      return toProcessRecord(await prisma.process.findFirst({
        where: { processNumber },
        include: { clientRecord: true },
      }));
    },

    async findProcessById(id) {
      return toProcessRecord(await prisma.process.findUnique({
        where: { id },
        include: { clientRecord: true },
      }));
    },

    async findClientById(id) {
      return toClientRecord(await prisma.client.findUnique({ where: { id } }));
    },

    async findClientByCpfCnpj(cpfCnpj) {
      return toClientRecord(await prisma.client.findFirst({ where: { cpfCnpj } }));
    },

    async findClientByName(name) {
      return toClientRecord(await prisma.client.findFirst({ where: { name } }));
    },

    async createClient(data) {
      return toClientRecord(await prisma.client.create({ data })) as CrmClientRecord;
    },

    async updateClient(id, data) {
      return toClientRecord(await prisma.client.update({ where: { id }, data })) as CrmClientRecord;
    },

    async runInTransaction<T>(callback: (tx: OpportunityConversionTransaction) => Promise<T>) {
      return prisma.$transaction(async (tx) => callback({
        createProcess: async (data) => toProcessRecord(await tx.process.create({
          data,
          include: { clientRecord: true },
        })) as CrmProcessRecord,
        updateOpportunityAfterConversion: async (data) => toOpportunityRecord(await tx.crmOpportunity.update({
          where: { id: data.opportunityId },
          data: {
            clientId: data.clientId,
            convertedProcessId: data.convertedProcessId,
            personName: data.personName,
            status: data.status,
            summary: data.summary,
            contactEvents: {
              create: data.contactEvent,
            },
          },
          include: { clientRecord: true, contactEvents: { orderBy: { createdAt: 'desc' } } },
        })) as CrmOpportunityRecord,
      }));
    },
  };
}
