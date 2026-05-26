type RawPublicationRecord = {
  id: number;
  publicationType: string;
  status: string;
  impact: string;
  tribunal: string;
  origin: string;
  publishedAt: Date;
  summary: string;
  relevantText: string;
  requiresAction?: boolean | null;
  convertedToDeadline?: boolean | null;
  derivedDeadlineLabel?: string | null;
  derivedDeadlineId?: number | null;
  notes?: string | null;
  read?: boolean | null;
  correlationId?: string | null;
  sourceType?: string | null;
  sourceReference?: string | null;
  originKind?: 'capture' | 'publication' | null;
  originStage?: string | null;
  consolidationStatus?: string | null;
  captureId?: number | null;
  eventId?: number | null;
  evidenceUrl?: string | null;
  publicationUrl?: string | null;
  timelineUrl?: string | null;
  pipelineStatus?: string | null;
  pipelineTimeline?: PublicationTimelineItem[] | null;
  derivedActions?: DerivedActionRecord[] | null;
  fallbacks?: FallbackRecord[] | null;
  processId: number;
  process?: {
    id: number;
    title: string;
    client: string;
    clientRecord?: { id: number; name: string } | null;
  } | null;
  clientRecord?: { id: number; name: string } | null;
};

type PublicationTimelineItem = {
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

function buildPublicationOriginReference(publication: RawPublicationRecord) {
  const correlationId = normalizeOptionalString(publication.correlationId);
  const sourceType = normalizeOptionalString(publication.sourceType) ?? 'publication';
  const sourceReference = normalizeOptionalString(publication.sourceReference) ?? `publication:${publication.id}`;
  const originStage = normalizeOptionalString(publication.originStage) ?? publication.pipelineStatus ?? publication.status;
  const publicationUrl = normalizeOptionalString(publication.publicationUrl) ?? `/publications/${publication.id}`;
  const timelineUrl = normalizeOptionalString(publication.timelineUrl) ?? (correlationId ? `/publication-pipeline/${correlationId}` : null);

  return {
    correlationId,
    sourceType,
    sourceReference,
    originKind: publication.originKind ?? 'publication',
    originLabel: publication.origin,
    originStage,
    consolidationStatus: normalizeOptionalString(publication.consolidationStatus) ?? 'consolidado',
    captureId: publication.captureId ?? null,
    eventId: publication.eventId ?? null,
    publicationId: publication.id,
    evidenceUrl: normalizeOptionalString(publication.evidenceUrl) ?? null,
    publicationUrl,
    timelineUrl,
  };
}

function buildPublicationPipeline(publication: RawPublicationRecord) {
  return {
    status: normalizeOptionalString(publication.pipelineStatus) ?? publication.status,
    timeline: publication.pipelineTimeline ?? [],
  };
}

function buildPublicationDerivedActions(publication: RawPublicationRecord): DerivedActionRecord[] {
  if (publication.derivedActions?.length) {
    return publication.derivedActions;
  }

  if (publication.derivedDeadlineId == null) {
    return [];
  }

  return [
    {
      entityType: 'deadline',
      entityId: publication.derivedDeadlineId,
      correlationId: normalizeOptionalString(publication.correlationId),
      sourceType: normalizeOptionalString(publication.sourceType) ?? 'publication',
      sourceReference: normalizeOptionalString(publication.sourceReference) ?? `publication:${publication.id}`,
      originStage: normalizeOptionalString(publication.originStage) ?? normalizeOptionalString(publication.pipelineStatus) ?? publication.status,
      status: publication.convertedToDeadline ? 'gerou_prazo' : publication.status,
      title: publication.derivedDeadlineLabel ?? `Prazo derivado da publicacao #${publication.id}`,
      summary: normalizeOptionalString(publication.summary),
      url: `/deadlines/${publication.derivedDeadlineId}`,
      createdAt: publication.publishedAt.toISOString(),
    },
  ];
}

export function buildPublicationPayload(publication: RawPublicationRecord) {
  const process = publication.process ?? null;
  const client = publication.clientRecord ?? process?.clientRecord ?? null;
  const originReference = buildPublicationOriginReference(publication);
  const pipeline = buildPublicationPipeline(publication);
  const derivedActions = buildPublicationDerivedActions(publication);
  const fallbacks = publication.fallbacks ?? [];

  return {
    id: publication.id,
    tipo: publication.publicationType,
    status: publication.status,
    impacto: publication.impact,
    processId: publication.processId,
    processLabel: `#${publication.processId}`,
    processTitle: process?.title ?? '',
    client: client?.name ?? process?.client ?? 'Cliente não informado',
    tribunal: publication.tribunal,
    origem: publication.origin,
    dataPublicacao: publication.publishedAt.toISOString().slice(0, 10),
    resumo: publication.summary,
    textoRelevante: publication.relevantText,
    exigeAcao: Boolean(publication.requiresAction),
    convertidaEmPrazo: Boolean(publication.convertedToDeadline),
    prazoDerivedoLabel: publication.derivedDeadlineLabel ?? null,
    derivedDeadlineId: publication.derivedDeadlineId ?? null,
    observacoes: publication.notes ?? '',
    lida: Boolean(publication.read),
    correlationId: originReference.correlationId,
    originReference,
    pipeline,
    derivedActions,
    fallbacks,
  };
}
