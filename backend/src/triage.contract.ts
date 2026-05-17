type RawTriageItem = {
  id: number;
  queueType: string;
  status: string;
  suggestedAction: string;
  suggestedReason: string;
  aiConfidenceBand?: string | null;
  aiScoreRaw?: number | null;
  postponeUntil?: Date | null;
  assignedQueue?: string | null;
  handledBy?: string | null;
  handledAt?: Date | null;
  discardReason?: string | null;
  discardNote?: string | null;
  sourceLabel?: string | null;
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
  return {
    id: item.id,
    queueType: item.queueType,
    status: item.status,
    suggestedAction: item.suggestedAction,
    suggestedReason: item.suggestedReason,
    aiConfidenceBand: item.aiConfidenceBand ?? 'media',
    aiScoreRaw: item.aiScoreRaw ?? null,
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
