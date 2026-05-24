import type { CrmProspectingRepository, ProspectClientRecord, ProspectLeadRecord } from './crm-prospecting.types';

type RecordMap = Record<string, unknown>;

function toClient(row: RecordMap | null | undefined): ProspectClientRecord | null {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: String(row.name),
    cpfCnpj: row.cpfCnpj ? String(row.cpfCnpj) : null,
    status: String(row.status),
  };
}

function toLead(row: RecordMap | null | undefined): ProspectLeadRecord | null {
  if (!row) return null;
  return {
    id: Number(row.id),
    clientId: row.clientId === null || row.clientId === undefined ? null : Number(row.clientId),
    cpf: row.cpf ? String(row.cpf) : null,
    personName: String(row.personName),
    source: String(row.source),
    status: String(row.status),
    summary: String(row.summary),
  };
}

const closedProcessStatuses = ['encerrado', 'concluido', 'arquivado', 'finalizado'];

export function createPrismaCrmProspectingRepository(prisma: {
  client: {
    findFirst(args: { where: Record<string, unknown>; select: Record<string, boolean> }): Promise<RecordMap | null>;
  };
  process: {
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
  crmLead: {
    findFirst(args: { where: Record<string, unknown> }): Promise<RecordMap | null>;
    create(args: { data: Record<string, unknown> }): Promise<RecordMap>;
    update(args: { where: { id: number }; data: Record<string, unknown> }): Promise<RecordMap>;
  };
}): CrmProspectingRepository {
  return {
    async findClientByCpfCnpj(cpfCnpj) {
      return toClient(await prisma.client.findFirst({
        where: { cpfCnpj },
        select: { id: true, name: true, cpfCnpj: true, status: true },
      }));
    },

    async hasActiveProcessByClientId(clientId) {
      const count = await prisma.process.count({
        where: {
          clientId,
          status: { notIn: closedProcessStatuses },
        },
      });

      return count > 0;
    },

    async findLeadByCpfCnpj(cpfCnpj) {
      return toLead(await prisma.crmLead.findFirst({
        where: { cpf: cpfCnpj },
      }));
    },

    async createLead(input) {
      return toLead(await prisma.crmLead.create({
        data: input,
      })) as ProspectLeadRecord;
    },

    async updateLead(leadId, input) {
      return toLead(await prisma.crmLead.update({
        where: { id: leadId },
        data: input,
      })) as ProspectLeadRecord;
    },
  };
}
