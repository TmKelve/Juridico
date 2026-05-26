import {
  buildReadableOriginLabel,
  compareIsoDateTimeAsc,
  computePublicationConsolidationStatus,
  computePublicationCorrelationId,
  computePublicationPipelineStatus,
  normalizeIsoDateTime,
  normalizeOptionalString,
  normalizeSourceType,
} from '../correlation';
import type { PublicationCaptureRecordContract, PublicationNormalizedRecordContract } from '../capture';
import type {
  CaptureEvidenceFetchContract,
  CrmOriginReferenceContract,
  DerivedActionRecordContract,
  PublicationConsolidatedSnapshot,
  PublicationPipelineTimelineContract,
  PublicationTimelineAssemblyInput,
  PublicationTimelineItemContract,
  TriageOriginReferenceContract,
} from './publication-origin-pipeline.types';

function buildTimelineItemId(entityType: string, entityId: number | null, stage: string, occurredAt: string) {
  return `${entityType}:${entityId ?? 'na'}:${stage}:${occurredAt}`;
}

function buildCaptureTimelineItem(capture: PublicationCaptureRecordContract): PublicationTimelineItemContract {
  return {
    id: buildTimelineItemId('capture', capture.id, capture.originStage, capture.occurredAt),
    entityType: 'capture',
    entityId: capture.id,
    stage: capture.originStage,
    title: `Captura ${capture.sourceType.toUpperCase()}`,
    summary: capture.normalizedText || capture.evidenceText || 'Sem conteúdo de captura',
    status: capture.pipelineStatus,
    occurredAt: capture.occurredAt,
    sourceType: capture.sourceType,
    sourceReference: capture.sourceReference,
    link: capture.id ? `/publication-captures/${capture.id}` : null,
  };
}

function buildEventTimelineItem(event: PublicationNormalizedRecordContract): PublicationTimelineItemContract {
  return {
    id: buildTimelineItemId('event', event.id, event.originStage, event.eventAt),
    entityType: 'event',
    entityId: event.id,
    stage: event.originStage,
    title: event.title,
    summary: event.summary,
    status: event.pipelineStatus,
    occurredAt: event.eventAt,
    sourceType: event.sourceType,
    sourceReference: event.sourceReference,
    link: event.id ? `/publication-pipeline/${event.correlationId}` : null,
  };
}

function buildPublicationTimelineItem(
  publication: PublicationConsolidatedSnapshot,
  correlationId: string,
): PublicationTimelineItemContract {
  const occurredAt = normalizeIsoDateTime(publication.publishedAt) ?? new Date().toISOString();
  const stage = publication.originStage ?? 'consolidado';
  return {
    id: buildTimelineItemId('publication', publication.id, stage, occurredAt),
    entityType: 'publication',
    entityId: publication.id,
    stage,
    title: `Publicação consolidada #${publication.id}`,
    summary: normalizeOptionalString(publication.summary) ?? 'Publicação consolidada',
    status: publication.status ?? 'ativa',
    occurredAt,
    sourceType: normalizeOptionalString(publication.sourceType),
    sourceReference: normalizeOptionalString(publication.sourceReference),
    link: `/publications/${publication.id}?correlationId=${correlationId}`,
  };
}

function buildDerivedActionTimelineItem(action: DerivedActionRecordContract): PublicationTimelineItemContract {
  return {
    id: buildTimelineItemId(action.entityType, action.entityId, action.originStage, action.createdAt),
    entityType: action.entityType,
    entityId: action.entityId,
    stage: action.originStage,
    title: action.title,
    summary: action.summary ?? `${action.entityType} derivado`,
    status: action.status,
    occurredAt: action.createdAt,
    sourceType: action.sourceType,
    sourceReference: action.sourceReference,
    link: action.url,
  };
}

export function buildDerivedActionRecord(input: {
  entityType: DerivedActionRecordContract['entityType'];
  entityId: number;
  correlationId: string;
  sourceType: string;
  sourceReference: string;
  originStage: string;
  status: string;
  title: string;
  summary?: string | null;
  url?: string | null;
  createdAt: string | Date;
}): DerivedActionRecordContract {
  return {
    entityType: input.entityType,
    entityId: input.entityId,
    correlationId: input.correlationId,
    sourceType: normalizeSourceType(input.sourceType),
    sourceReference: normalizeOptionalString(input.sourceReference) ?? '',
    originStage: normalizeOptionalString(input.originStage) ?? 'capturado',
    status: normalizeOptionalString(input.status) ?? 'pendente',
    title: normalizeOptionalString(input.title) ?? `${input.entityType} derivado`,
    summary: normalizeOptionalString(input.summary),
    url: normalizeOptionalString(input.url),
    createdAt: normalizeIsoDateTime(input.createdAt) ?? new Date().toISOString(),
  };
}

export function adaptLegacyDerivedAction(input: {
  triageItem?: {
    id: number;
    status?: string | null;
    queueType?: string | null;
    suggestedAction?: string | null;
    createdAt?: string | Date | null;
  } | null;
  crmLead?: {
    id: number;
    status?: string | null;
    summary?: string | null;
    createdAt?: string | Date | null;
  } | null;
  crmOpportunity?: {
    id: number;
    status?: string | null;
    summary?: string | null;
    createdAt?: string | Date | null;
  } | null;
  deadline?: {
    id: number;
    status?: string | null;
    title?: string | null;
    notes?: string | null;
    createdAt?: string | Date | null;
  } | null;
  task?: {
    id: number;
    status?: string | null;
    title?: string | null;
    description?: string | null;
    createdAt?: string | Date | null;
  } | null;
  correlationId: string;
  sourceType: string;
  sourceReference: string;
  originStage?: string | null;
}) {
  const originStage = normalizeOptionalString(input.originStage) ?? 'capturado';

  if (input.task) {
    return buildDerivedActionRecord({
      entityType: 'task',
      entityId: input.task.id,
      correlationId: input.correlationId,
      sourceType: input.sourceType,
      sourceReference: input.sourceReference,
      originStage,
      status: input.task.status ?? 'pendente',
      title: input.task.title ?? `Tarefa #${input.task.id}`,
      summary: input.task.description,
      url: `/tasks/${input.task.id}`,
      createdAt: input.task.createdAt ?? new Date().toISOString(),
    });
  }

  if (input.deadline) {
    return buildDerivedActionRecord({
      entityType: 'deadline',
      entityId: input.deadline.id,
      correlationId: input.correlationId,
      sourceType: input.sourceType,
      sourceReference: input.sourceReference,
      originStage,
      status: input.deadline.status ?? 'aberto',
      title: input.deadline.title ?? `Prazo #${input.deadline.id}`,
      summary: input.deadline.notes,
      url: `/deadlines/${input.deadline.id}`,
      createdAt: input.deadline.createdAt ?? new Date().toISOString(),
    });
  }

  if (input.crmOpportunity) {
    return buildDerivedActionRecord({
      entityType: 'crm_opportunity',
      entityId: input.crmOpportunity.id,
      correlationId: input.correlationId,
      sourceType: input.sourceType,
      sourceReference: input.sourceReference,
      originStage,
      status: input.crmOpportunity.status ?? 'acao_recomendada',
      title: `Oportunidade CRM #${input.crmOpportunity.id}`,
      summary: input.crmOpportunity.summary,
      url: `/crm/opportunities/${input.crmOpportunity.id}`,
      createdAt: input.crmOpportunity.createdAt ?? new Date().toISOString(),
    });
  }

  if (input.crmLead) {
    return buildDerivedActionRecord({
      entityType: 'crm_lead',
      entityId: input.crmLead.id,
      correlationId: input.correlationId,
      sourceType: input.sourceType,
      sourceReference: input.sourceReference,
      originStage,
      status: input.crmLead.status ?? 'novo',
      title: `Lead CRM #${input.crmLead.id}`,
      summary: input.crmLead.summary,
      url: `/crm/leads/${input.crmLead.id}`,
      createdAt: input.crmLead.createdAt ?? new Date().toISOString(),
    });
  }

  if (!input.triageItem) return null;

  return buildDerivedActionRecord({
    entityType: 'triage',
    entityId: input.triageItem.id,
    correlationId: input.correlationId,
    sourceType: input.sourceType,
    sourceReference: input.sourceReference,
    originStage,
    status: input.triageItem.status ?? 'pendente',
    title: `Triagem #${input.triageItem.id}`,
    summary: input.triageItem.suggestedAction ?? input.triageItem.queueType,
    url: `/triage/${input.triageItem.id}`,
    createdAt: input.triageItem.createdAt ?? new Date().toISOString(),
  });
}

export function buildPublicationPipelineTimeline(
  input: PublicationTimelineAssemblyInput,
): PublicationPipelineTimelineContract {
  const items: PublicationTimelineItemContract[] = [buildCaptureTimelineItem(input.capture)];
  if (input.event) items.push(buildEventTimelineItem(input.event));
  if (input.publication) items.push(buildPublicationTimelineItem(input.publication, input.capture.correlationId));
  for (const action of input.derivedActions ?? []) {
    items.push(buildDerivedActionTimelineItem(action));
  }

  return {
    correlationId: input.capture.correlationId,
    items: items.sort((left, right) => compareIsoDateTimeAsc(left.occurredAt, right.occurredAt)),
  };
}

export function buildCrmOriginReference(input: {
  capture: PublicationCaptureRecordContract;
  event?: PublicationNormalizedRecordContract | null;
  publication?: PublicationConsolidatedSnapshot | null;
}): CrmOriginReferenceContract {
  const publicationId = input.publication?.id ?? input.event?.publicationId ?? null;
  return {
    correlationId: input.capture.correlationId,
    sourceType: input.capture.sourceType,
    sourceReference: input.capture.sourceReference,
    originKind: publicationId ? 'publication' : 'capture',
    originLabel: buildReadableOriginLabel({
      sourceType: input.capture.sourceType,
      sourceReference: input.capture.sourceReference,
      tribunal: input.capture.tribunal,
      processNumber: input.capture.processNumber,
    }),
    originStage: input.publication?.originStage ?? input.event?.originStage ?? input.capture.originStage,
    consolidationStatus: computePublicationConsolidationStatus({
      consolidationStatus: input.publication?.consolidationStatus ?? input.capture.consolidationStatus,
      eventId: input.event?.id,
      publicationId,
    }),
    captureId: input.capture.id,
    eventId: input.event?.id ?? null,
    publicationId,
    evidenceUrl: input.capture.id ? `/publication-captures/${input.capture.id}/evidence` : null,
    publicationUrl: publicationId ? `/publications/${publicationId}` : null,
    timelineUrl: `/publication-pipeline/${input.capture.correlationId}`,
  };
}

export function buildTriageOriginReference(input: {
  capture: PublicationCaptureRecordContract;
  event?: PublicationNormalizedRecordContract | null;
  publication?: PublicationConsolidatedSnapshot | null;
}): TriageOriginReferenceContract {
  const publicationId = input.publication?.id ?? input.event?.publicationId ?? null;
  return {
    correlationId: input.capture.correlationId,
    sourceType: input.capture.sourceType,
    sourceReference: input.capture.sourceReference,
    originKind: publicationId ? 'publication' : 'capture',
    originStage: input.publication?.originStage ?? input.event?.originStage ?? input.capture.originStage,
    pipelineStatus: computePublicationPipelineStatus({
      pipelineStatus: input.event?.pipelineStatus ?? input.capture.pipelineStatus,
      originStage: input.publication?.originStage ?? input.event?.originStage ?? input.capture.originStage,
      eventId: input.event?.id,
      publicationId,
    }),
    captureId: input.capture.id ?? 0,
    eventId: input.event?.id ?? null,
    publicationId,
  };
}

export function buildCaptureEvidenceFetch(input: PublicationTimelineAssemblyInput): CaptureEvidenceFetchContract {
  const timeline = buildPublicationPipelineTimeline(input);
  return {
    capture: input.capture,
    timeline,
    derivedActions: input.derivedActions ?? [],
  };
}

export function buildPipelineAssemblyFromLegacyRows(input: {
  capture: PublicationCaptureRecordContract;
  event?: PublicationNormalizedRecordContract | null;
  publication?: PublicationConsolidatedSnapshot | null;
  triageItem?: {
    id: number;
    status?: string | null;
    queueType?: string | null;
    suggestedAction?: string | null;
    createdAt?: string | Date | null;
  } | null;
  crmLead?: {
    id: number;
    status?: string | null;
    summary?: string | null;
    createdAt?: string | Date | null;
  } | null;
  crmOpportunity?: {
    id: number;
    status?: string | null;
    summary?: string | null;
    createdAt?: string | Date | null;
  } | null;
  deadline?: {
    id: number;
    status?: string | null;
    title?: string | null;
    notes?: string | null;
    createdAt?: string | Date | null;
  } | null;
  task?: {
    id: number;
    status?: string | null;
    title?: string | null;
    description?: string | null;
    createdAt?: string | Date | null;
  } | null;
}) {
  const sourceType = input.event?.sourceType ?? input.capture.sourceType;
  const sourceReference = input.event?.sourceReference ?? input.capture.sourceReference;
  const originStage = input.publication?.originStage ?? input.event?.originStage ?? input.capture.originStage;
  const derivedActions = [
    adaptLegacyDerivedAction({
      triageItem: input.triageItem,
      correlationId: input.capture.correlationId,
      sourceType,
      sourceReference,
      originStage,
    }),
    adaptLegacyDerivedAction({
      crmLead: input.crmLead,
      correlationId: input.capture.correlationId,
      sourceType,
      sourceReference,
      originStage,
    }),
    adaptLegacyDerivedAction({
      crmOpportunity: input.crmOpportunity,
      correlationId: input.capture.correlationId,
      sourceType,
      sourceReference,
      originStage,
    }),
    adaptLegacyDerivedAction({
      deadline: input.deadline,
      correlationId: input.capture.correlationId,
      sourceType,
      sourceReference,
      originStage,
    }),
    adaptLegacyDerivedAction({
      task: input.task,
      correlationId: input.capture.correlationId,
      sourceType,
      sourceReference,
      originStage,
    }),
  ].filter(Boolean) as DerivedActionRecordContract[];

  return {
    capture: input.capture,
    event: input.event ?? null,
    publication: input.publication ?? null,
    derivedActions,
  };
}

export function inferPublicationSnapshot(input: {
  id: number;
  correlationId?: string | null;
  sourceType?: string | null;
  sourceReference?: string | null;
  originStage?: string | null;
  consolidationStatus?: string | null;
  status?: string | null;
  summary: string;
  publishedAt: string | Date;
  processNumber?: string | null;
}) {
  return {
    id: input.id,
    correlationId: input.correlationId ?? computePublicationCorrelationId({
      sourceType: input.sourceType ?? 'other',
      sourceReference: input.sourceReference ?? `publication:${input.id}`,
      processNumber: input.processNumber,
      occurredAt: input.publishedAt,
      normalizedText: input.summary,
    }),
    sourceType: normalizeOptionalString(input.sourceType),
    sourceReference: normalizeOptionalString(input.sourceReference),
    originStage: normalizeOptionalString(input.originStage) ?? 'consolidado',
    consolidationStatus: normalizeOptionalString(input.consolidationStatus) ?? 'consolidado',
    status: normalizeOptionalString(input.status) ?? 'nova',
    summary: input.summary,
    publishedAt: input.publishedAt,
  };
}
