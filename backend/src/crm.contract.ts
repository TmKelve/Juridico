type RawCrmLead = {
  id: number;
  cpf?: string | null;
  personName: string;
  source: string;
  status: string;
  responsible?: string | null;
  summary: string;
  lastContactAt?: Date | null;
  nextContactAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  clientRecord?: { id: number; name: string } | null;
  triageItems?: Array<{ id: number; queueType: string; status: string }> | null;
  contactEvents?: Array<{
    id: number;
    kind: string;
    summary: string;
    createdBy?: string | null;
    createdAt: Date;
  }> | null;
};

type RawCrmOpportunity = {
  id: number;
  convertedProcessId?: number | null;
  cpf?: string | null;
  personName: string;
  source: string;
  status: string;
  responsible?: string | null;
  summary: string;
  lastContactAt?: Date | null;
  nextContactAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  clientRecord?: { id: number; name: string } | null;
  triageItems?: Array<{ id: number; queueType: string; status: string }> | null;
  contactEvents?: Array<{
    id: number;
    kind: string;
    summary: string;
    createdBy?: string | null;
    createdAt: Date;
  }> | null;
};

export function buildCrmLeadPayload(item: RawCrmLead) {
  return {
    id: item.id,
    cpf: item.cpf ?? '',
    personName: item.personName,
    source: item.source,
    status: item.status,
    responsible: item.responsible ?? '',
    summary: item.summary,
    clientId: item.clientRecord?.id ?? null,
    client: item.clientRecord?.name ?? '',
    triageCount: item.triageItems?.length ?? 0,
    hasCriticalTriage: Boolean(item.triageItems?.some((triage) => triage.queueType === 'critica' && triage.status !== 'descartado')),
    lastContactAt: item.lastContactAt ? item.lastContactAt.toISOString() : null,
    nextContactAt: item.nextContactAt ? item.nextContactAt.toISOString() : null,
    contactEvents: (item.contactEvents ?? []).map((event) => ({
      id: event.id,
      kind: event.kind,
      summary: event.summary,
      createdBy: event.createdBy ?? '',
      createdAt: event.createdAt.toISOString(),
    })),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function buildCrmOpportunityPayload(item: RawCrmOpportunity) {
  return {
    id: item.id,
    convertedProcessId: item.convertedProcessId ?? null,
    cpf: item.cpf ?? '',
    personName: item.personName,
    source: item.source,
    status: item.status,
    responsible: item.responsible ?? '',
    summary: item.summary,
    clientId: item.clientRecord?.id ?? null,
    client: item.clientRecord?.name ?? '',
    triageCount: item.triageItems?.length ?? 0,
    hasCriticalTriage: Boolean(item.triageItems?.some((triage) => triage.queueType === 'critica' && triage.status !== 'descartado')),
    lastContactAt: item.lastContactAt ? item.lastContactAt.toISOString() : null,
    nextContactAt: item.nextContactAt ? item.nextContactAt.toISOString() : null,
    contactEvents: (item.contactEvents ?? []).map((event) => ({
      id: event.id,
      kind: event.kind,
      summary: event.summary,
      createdBy: event.createdBy ?? '',
      createdAt: event.createdAt.toISOString(),
    })),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}
