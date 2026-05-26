type RawTriageItem = {
  id: number;
  queueType: string;
  status: string;
  suggestedAction: string;
  suggestedReason: string;
  aiConfidenceBand?: string | null;
  aiScoreRaw?: number | null;
  priorityScore?: number | null;
  priorityLabel?: string | null;
  priorityReasons?: string[] | null;
  queueRank?: number | null;
  agingHours?: number | null;
  slaTargetAt?: Date | string | null;
  breached?: boolean | null;
  operationalBucket?: string | null;
  postponeUntil?: Date | null;
  assignedQueue?: string | null;
  handledBy?: string | null;
  handledAt?: Date | null;
  discardReason?: string | null;
  discardNote?: string | null;
  sourceLabel?: string | null;
  correlationId?: string | null;
  pipelineStatus?: string | null;
  originStage?: string | null;
  consolidationStatus?: string | null;
  pipelineTimeline?: TriageTimelineItem[] | null;
  derivedActions?: DerivedActionRecord[] | null;
  fallbacks?: FallbackRecord[] | null;
  createdAt: Date;
  updatedAt: Date;
  process?: { id: number; title: string; client: string } | null;
  clientRecord?: { id: number; name: string } | null;
  crmLead?: { id: number; personName: string; status: string } | null;
  crmOpportunity?: { id: number; personName: string; status: string } | null;
  capture: {
    id: number;
    sourceType: string;
    sourceReference: string;
    occurredAt: Date;
    tribunal?: string | null;
    processNumber?: string | null;
    cpf?: string | null;
    personName?: string | null;
    normalizedText: string;
    correlationId?: string | null;
  };
  event?: {
    id: number;
    publicationId?: number | null;
    title: string;
    summary: string;
    riskLevel: string;
    requiresAction: boolean;
    eventAt: Date;
  } | null;
};

type RawTriageDecision = {
  id: number;
  decisionType: string;
  decisionReason?: string | null;
  decisionNote?: string | null;
  decidedBy: string;
  decidedAt: Date;
  generatedTaskId?: number | null;
  generatedDeadlineId?: number | null;
  generatedLeadId?: number | null;
  generatedOpportunityId?: number | null;
};

type TriageTimelineItem = {
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

function resolveCorrelationId(item: RawTriageItem) {
  return normalizeOptionalString(item.correlationId) ?? normalizeOptionalString(item.capture.correlationId);
}

function buildOriginReference(item: RawTriageItem) {
  return {
    correlationId: resolveCorrelationId(item),
    sourceType: item.capture.sourceType,
    sourceReference: item.capture.sourceReference,
    originKind: item.event?.publicationId ? 'publication' : 'capture',
    originStage: normalizeOptionalString(item.originStage) ?? 'triado',
    pipelineStatus: normalizeOptionalString(item.pipelineStatus) ?? item.status,
    captureId: item.capture.id,
    eventId: item.event?.id ?? null,
    publicationId: item.event?.publicationId ?? null,
  };
}

function buildPipeline(item: RawTriageItem) {
  return {
    status: normalizeOptionalString(item.pipelineStatus) ?? item.status,
    timeline: item.pipelineTimeline ?? [],
    consolidationStatus: normalizeOptionalString(item.consolidationStatus) ?? null,
  };
}

function buildDerivedActions(item: RawTriageItem): DerivedActionRecord[] {
  if (item.derivedActions?.length) {
    return item.derivedActions;
  }

  const correlationId = resolveCorrelationId(item);
  const originStage = normalizeOptionalString(item.originStage) ?? 'triado';
  const createdAt = item.updatedAt.toISOString();
  const actions: DerivedActionRecord[] = [];

  if (item.crmLead?.id) {
    actions.push({
      entityType: 'crm_lead',
      entityId: item.crmLead.id,
      correlationId,
      sourceType: item.capture.sourceType,
      sourceReference: item.capture.sourceReference,
      originStage,
      status: item.crmLead.status,
      title: `Lead ${item.crmLead.personName}`,
      summary: item.suggestedReason,
      url: `/crm/leads/${item.crmLead.id}`,
      createdAt,
    });
  }

  if (item.crmOpportunity?.id) {
    actions.push({
      entityType: 'crm_opportunity',
      entityId: item.crmOpportunity.id,
      correlationId,
      sourceType: item.capture.sourceType,
      sourceReference: item.capture.sourceReference,
      originStage,
      status: item.crmOpportunity.status,
      title: `Oportunidade ${item.crmOpportunity.personName}`,
      summary: item.suggestedReason,
      url: `/crm/opportunities/${item.crmOpportunity.id}`,
      createdAt,
    });
  }

  return actions;
}

export function buildTriageDecisionPayload(decision: RawTriageDecision) {
  return {
    id: decision.id,
    decisionType: decision.decisionType,
    decisionReason: decision.decisionReason ?? '',
    decisionNote: decision.decisionNote ?? '',
    decidedBy: decision.decidedBy,
    decidedAt: decision.decidedAt.toISOString(),
    generatedTaskId: decision.generatedTaskId ?? null,
    generatedDeadlineId: decision.generatedDeadlineId ?? null,
    generatedLeadId: decision.generatedLeadId ?? null,
    generatedOpportunityId: decision.generatedOpportunityId ?? null,
  };
}

export function buildTriageItemPayload(item: RawTriageItem) {
  const resolvedSlaTargetAt =
    item.slaTargetAt instanceof Date
      ? item.slaTargetAt.toISOString()
      : typeof item.slaTargetAt === 'string' && item.slaTargetAt.trim()
        ? new Date(item.slaTargetAt).toISOString()
        : null;
  const originReference = buildOriginReference(item);
  const pipeline = buildPipeline(item);
  const derivedActions = buildDerivedActions(item);
  const fallbacks = item.fallbacks ?? [];

  return {
    id: item.id,
    queueType: item.queueType,
    status: item.status,
    suggestedAction: item.suggestedAction,
    suggestedReason: item.suggestedReason,
    aiConfidenceBand: item.aiConfidenceBand ?? 'media',
    aiScoreRaw: item.aiScoreRaw ?? null,
    priorityScore: item.priorityScore ?? null,
    priorityLabel: item.priorityLabel ?? null,
    priorityReasons: item.priorityReasons ?? [],
    queueRank: item.queueRank ?? null,
    agingHours: item.agingHours ?? null,
    slaTargetAt: resolvedSlaTargetAt,
    breached: Boolean(item.breached),
    operationalBucket: item.operationalBucket ?? null,
    postponeUntil: item.postponeUntil ? item.postponeUntil.toISOString() : null,
    assignedQueue: item.assignedQueue ?? 'fila_central',
    handledBy: item.handledBy ?? null,
    handledAt: item.handledAt ? item.handledAt.toISOString() : null,
    discardReason: item.discardReason ?? null,
    discardNote: item.discardNote ?? null,
    sourceLabel: item.sourceLabel ?? item.capture.sourceType,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    processId: item.process?.id ?? null,
    processLabel: item.process ? `#${item.process.id}` : '',
    processTitle: item.process?.title ?? '',
    clientId: item.clientRecord?.id ?? null,
    client: item.clientRecord?.name ?? item.process?.client ?? item.capture.personName ?? 'Cliente não identificado',
    crmLeadId: item.crmLead?.id ?? null,
    crmOpportunityId: item.crmOpportunity?.id ?? null,
    correlationId: originReference.correlationId,
    originReference,
    pipeline,
    derivedActions,
    fallbacks,
    capture: {
      id: item.capture.id,
      sourceType: item.capture.sourceType,
      sourceReference: item.capture.sourceReference,
      occurredAt: item.capture.occurredAt.toISOString(),
      tribunal: item.capture.tribunal ?? '',
      processNumber: item.capture.processNumber ?? '',
      cpf: item.capture.cpf ?? '',
      personName: item.capture.personName ?? '',
      normalizedText: item.capture.normalizedText,
    },
    event: item.event
      ? {
          id: item.event.id,
          publicationId: (item.event as { publicationId?: number | null }).publicationId ?? null,
          title: item.event.title,
          summary: item.event.summary,
          riskLevel: item.event.riskLevel,
          requiresAction: item.event.requiresAction,
          eventAt: item.event.eventAt.toISOString(),
        }
      : null,
  };
}
