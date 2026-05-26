type TriageOriginRecord = {
  id: number;
  queueType: string;
  status: string;
  suggestedReason?: string | null;
  correlationId?: string | null;
  pipelineStatus?: string | null;
  originStage?: string | null;
  consolidationStatus?: string | null;
  capture?: {
    id: number;
    sourceType: string;
    sourceReference: string;
    occurredAt?: Date | null;
    correlationId?: string | null;
  } | null;
  event?: {
    id: number;
    publicationId?: number | null;
    eventAt?: Date | null;
    title?: string | null;
    summary?: string | null;
  } | null;
} | null;

type OriginReferenceRecord = {
  correlationId: string | null;
  sourceType: string;
  sourceReference: string;
  originKind: 'capture' | 'publication';
  originLabel: string;
  originStage: string;
  pipelineStatus: string;
  consolidationStatus: string;
  captureId: number | null;
  eventId: number | null;
  publicationId: number | null;
  evidenceUrl: string | null;
  publicationUrl: string | null;
  timelineUrl: string | null;
};

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
  correlationId?: string | null;
  sourceType?: string | null;
  sourceReference?: string | null;
  originStage?: string | null;
  consolidationStatus?: string | null;
  captureId?: number | null;
  eventId?: number | null;
  publicationId?: number | null;
  originReference?: OriginReferenceRecord | null;
  pipelineStatus?: string | null;
  pipelineTimeline?: Array<{
    id: string;
    entityType: string;
    entityId: number | null;
    stage: string;
    title: string;
    summary: string;
    status: string;
    occurredAt: string;
    sourceType?: string | null;
    sourceReference?: string | null;
    link?: string | null;
  }> | null;
  clientRecord?: { id: number; name: string } | null;
  triageItems?: TriageOriginRecord[] | null;
  contactEvents?: Array<{
    id: number;
    kind: string;
    summary: string;
    createdBy?: string | null;
    createdAt: Date;
  }> | null;
  derivedActions?: DerivedActionRecord[] | null;
  fallbacks?: FallbackRecord[] | null;
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
  correlationId?: string | null;
  sourceType?: string | null;
  sourceReference?: string | null;
  originStage?: string | null;
  consolidationStatus?: string | null;
  captureId?: number | null;
  eventId?: number | null;
  publicationId?: number | null;
  originReference?: OriginReferenceRecord | null;
  pipelineStatus?: string | null;
  pipelineTimeline?: Array<{
    id: string;
    entityType: string;
    entityId: number | null;
    stage: string;
    title: string;
    summary: string;
    status: string;
    occurredAt: string;
    sourceType?: string | null;
    sourceReference?: string | null;
    link?: string | null;
  }> | null;
  clientRecord?: { id: number; name: string } | null;
  triageItems?: TriageOriginRecord[] | null;
  contactEvents?: Array<{
    id: number;
    kind: string;
    summary: string;
    createdBy?: string | null;
    createdAt: Date;
  }> | null;
  derivedActions?: DerivedActionRecord[] | null;
  fallbacks?: FallbackRecord[] | null;
};

type DerivedActionRecord = {
  entityType: string;
  entityId: number;
  correlationId: string | null;
  sourceType: string;
  sourceReference: string;
  originStage: string;
  status: string;
  title: string;
  summary: string | null;
  url: string | null;
  createdAt: string;
};

type FallbackRecord = {
  code: string;
  message: string;
};

function normalizeOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function pickTriageOrigin(triageItems?: TriageOriginRecord[] | null) {
  return triageItems?.[0] ?? null;
}

function resolveCorrelationId(
  item: Pick<RawCrmLead, 'correlationId' | 'captureId' | 'eventId' | 'publicationId'>
    & { triageItems?: TriageOriginRecord[] | null },
) {
  const triage = pickTriageOrigin(item.triageItems);
  const triageCorrelation = normalizeOptionalString(triage?.correlationId) ?? normalizeOptionalString(triage?.capture?.correlationId);
  if (triageCorrelation) return triageCorrelation;
  if (normalizeOptionalString(item.correlationId)) return normalizeOptionalString(item.correlationId);
  if (item.captureId) return `capture:${item.captureId}`;
  if (item.eventId) return `event:${item.eventId}`;
  if (item.publicationId) return `publication:${item.publicationId}`;
  return null;
}

function buildOriginReference(
  item: Pick<
    RawCrmLead,
    'id' | 'source' | 'sourceType' | 'sourceReference' | 'originStage' | 'consolidationStatus' | 'captureId' | 'eventId' | 'publicationId' | 'createdAt' | 'triageItems' | 'originReference' | 'pipelineStatus'
  >,
): OriginReferenceRecord {
  if (item.originReference) {
    return item.originReference;
  }

  const triage = pickTriageOrigin(item.triageItems);
  const correlationId = resolveCorrelationId(item);
  const sourceType = normalizeOptionalString(item.sourceType) ?? triage?.capture?.sourceType ?? item.source;
  const sourceReference = normalizeOptionalString(item.sourceReference) ?? triage?.capture?.sourceReference ?? `crm:${item.id}`;
  const captureId = item.captureId ?? triage?.capture?.id ?? null;
  const eventId = item.eventId ?? triage?.event?.id ?? null;
  const publicationId = item.publicationId ?? triage?.event?.publicationId ?? null;
  const originStage = normalizeOptionalString(item.originStage) ?? normalizeOptionalString(triage?.originStage) ?? (publicationId ? 'gerou_crm' : 'triado');
  const pipelineStatus = normalizeOptionalString(triage?.pipelineStatus) ?? originStage;
  const consolidationStatus = normalizeOptionalString(item.consolidationStatus) ?? normalizeOptionalString(triage?.consolidationStatus) ?? (publicationId ? 'consolidado' : 'aguardando_consolidacao');
  const originKind = publicationId ? 'publication' : 'capture';

  return {
    correlationId,
    sourceType,
    sourceReference,
    originKind,
    originLabel: originKind === 'publication' ? 'Publicação consolidada' : sourceType === 'cpf' ? 'CPF capturado no diário' : `Captura ${sourceType}`,
    originStage,
    pipelineStatus,
    consolidationStatus,
    captureId,
    eventId,
    publicationId,
    evidenceUrl: captureId ? `/publication-captures/${captureId}/evidence` : null,
    publicationUrl: publicationId ? `/publications/${publicationId}` : null,
    timelineUrl: correlationId ? `/publication-pipeline/${correlationId}` : null,
  };
}

function buildDerivedActions(
  item: Pick<RawCrmLead, 'id' | 'createdAt' | 'source' | 'summary' | 'status' | 'triageItems' | 'derivedActions'>
    & { originReference: OriginReferenceRecord },
  ): DerivedActionRecord[] {
  if (item.derivedActions?.length) {
    return item.derivedActions;
  }

  const triage = pickTriageOrigin(item.triageItems);
  const records: DerivedActionRecord[] = [];

  if (triage?.id) {
    records.push({
      entityType: 'triage',
      entityId: triage.id,
      correlationId: item.originReference.correlationId,
      sourceType: item.originReference.sourceType,
      sourceReference: item.originReference.sourceReference,
      originStage: item.originReference.originStage,
      status: triage.status,
      title: `Triagem #${triage.id}`,
      summary: triage.suggestedReason ?? item.summary,
      url: `/triagem?triageItemId=${triage.id}`,
      createdAt: item.createdAt.toISOString(),
    });
  }

  return records;
}

function buildFallbacks(item: Pick<RawCrmLead, 'publicationId' | 'triageItems' | 'fallbacks'>) {
  if (item.fallbacks?.length) {
    return item.fallbacks;
  }

  const triage = pickTriageOrigin(item.triageItems);
  if (item.publicationId || triage?.event?.publicationId) {
    return [];
  }

  return [
    {
      code: 'NO_CONSOLIDATED_PUBLICATION',
      message: 'A ação deriva de captura/sinal ainda sem publicação consolidada.',
    },
  ] satisfies FallbackRecord[];
}

export function buildCrmLeadPayload(item: RawCrmLead) {
  const originReference = buildOriginReference(item);
  const derivedActions = buildDerivedActions({ ...item, originReference });
  const fallbacks = buildFallbacks(item);

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
    hasCriticalTriage: Boolean(item.triageItems?.some((triage) => triage?.queueType === 'critica' && triage?.status !== 'descartado')),
    lastContactAt: item.lastContactAt ? item.lastContactAt.toISOString() : null,
    nextContactAt: item.nextContactAt ? item.nextContactAt.toISOString() : null,
    contactEvents: (item.contactEvents ?? []).map((event) => ({
      id: event.id,
      kind: event.kind,
      summary: event.summary,
      createdBy: event.createdBy ?? '',
      createdAt: event.createdAt.toISOString(),
    })),
    correlationId: originReference.correlationId,
    originReference,
    pipeline: {
      status: item.pipelineStatus ?? originReference.pipelineStatus,
      consolidationStatus: originReference.consolidationStatus,
      timeline: item.pipelineTimeline ?? [],
    },
    derivedActions,
    fallbacks,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function buildCrmOpportunityPayload(item: RawCrmOpportunity) {
  const originReference = buildOriginReference(item);
  const derivedActions = buildDerivedActions({ ...item, originReference });
  const fallbacks = buildFallbacks(item);

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
    hasCriticalTriage: Boolean(item.triageItems?.some((triage) => triage?.queueType === 'critica' && triage?.status !== 'descartado')),
    lastContactAt: item.lastContactAt ? item.lastContactAt.toISOString() : null,
    nextContactAt: item.nextContactAt ? item.nextContactAt.toISOString() : null,
    contactEvents: (item.contactEvents ?? []).map((event) => ({
      id: event.id,
      kind: event.kind,
      summary: event.summary,
      createdBy: event.createdBy ?? '',
      createdAt: event.createdAt.toISOString(),
    })),
    correlationId: originReference.correlationId,
    originReference,
    pipeline: {
      status: item.pipelineStatus ?? originReference.pipelineStatus,
      consolidationStatus: originReference.consolidationStatus,
      timeline: item.pipelineTimeline ?? [],
    },
    derivedActions,
    fallbacks,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}
