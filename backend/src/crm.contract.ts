type RawCrmLead = {
  id: number;
  cpf?: string | null;
  personName: string;
  source: string;
  status: string;
  summary: string;
  createdAt: Date;
  updatedAt: Date;
  clientRecord?: { id: number; name: string } | null;
  triageItems?: Array<{ id: number; queueType: string; status: string }> | null;
};

type RawCrmOpportunity = {
  id: number;
  cpf?: string | null;
  personName: string;
  source: string;
  status: string;
  summary: string;
  createdAt: Date;
  updatedAt: Date;
  clientRecord?: { id: number; name: string } | null;
  triageItems?: Array<{ id: number; queueType: string; status: string }> | null;
};

export function buildCrmLeadPayload(item: RawCrmLead) {
  return {
    id: item.id,
    cpf: item.cpf ?? '',
    personName: item.personName,
    source: item.source,
    status: item.status,
    summary: item.summary,
    clientId: item.clientRecord?.id ?? null,
    client: item.clientRecord?.name ?? '',
    triageCount: item.triageItems?.length ?? 0,
    hasCriticalTriage: Boolean(item.triageItems?.some((triage) => triage.queueType === 'critica' && triage.status !== 'descartado')),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function buildCrmOpportunityPayload(item: RawCrmOpportunity) {
  return {
    id: item.id,
    cpf: item.cpf ?? '',
    personName: item.personName,
    source: item.source,
    status: item.status,
    summary: item.summary,
    clientId: item.clientRecord?.id ?? null,
    client: item.clientRecord?.name ?? '',
    triageCount: item.triageItems?.length ?? 0,
    hasCriticalTriage: Boolean(item.triageItems?.some((triage) => triage.queueType === 'critica' && triage.status !== 'descartado')),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}
