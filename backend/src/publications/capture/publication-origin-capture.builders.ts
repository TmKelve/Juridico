import {
  buildPublicationOriginSummary,
  computePublicationConsolidationStatus,
  computePublicationCorrelationId,
  computePublicationPipelineStatus,
  normalizeIsoDateTime,
  normalizeOptionalString,
  normalizeSourceType,
} from '../correlation';
import type {
  PublicationCaptureRecordContract,
  PublicationCaptureSnapshot,
  PublicationConsolidationSnapshot,
  PublicationConsolidationStatusContract,
  PublicationNormalizedEventSnapshot,
  PublicationNormalizedRecordContract,
} from './publication-origin-capture.types';

function normalizeRiskLevel(value: string | null | undefined): PublicationNormalizedRecordContract['riskLevel'] {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (normalized === 'critico' || normalized === 'alto' || normalized === 'medio' || normalized === 'baixo') {
    return normalized;
  }
  return 'normal';
}

export function buildPublicationCaptureRecord(input: PublicationCaptureSnapshot): PublicationCaptureRecordContract {
  const originSummary = buildPublicationOriginSummary({
    correlation: {
      sourceType: input.sourceType,
      sourceReference: input.sourceReference,
      processNumber: input.processNumber,
      cpfCnpj: input.cpfCnpj,
      oabNumber: input.oabNumber,
      personName: input.personName,
      tribunal: input.tribunal,
      occurredAt: input.occurredAt,
      evidenceText: input.evidenceText,
      normalizedText: input.normalizedText,
    },
    status: {
      originStage: input.originStage,
      pipelineStatus: input.pipelineStatus,
      consolidationStatus: input.consolidationStatus,
    },
    occurredAt: input.occurredAt,
  });

  return {
    id: input.id ?? null,
    correlationId: input.correlationId ?? originSummary.correlationId ?? computePublicationCorrelationId({
      sourceType: input.sourceType,
      sourceReference: input.sourceReference,
      processNumber: input.processNumber,
      cpfCnpj: input.cpfCnpj,
      oabNumber: input.oabNumber,
      personName: input.personName,
      tribunal: input.tribunal,
      occurredAt: input.occurredAt,
      evidenceText: input.evidenceText,
      normalizedText: input.normalizedText,
    }),
    sourceType: normalizeSourceType(input.sourceType),
    sourceReference: normalizeOptionalString(input.sourceReference) ?? '',
    originStage: input.originStage === 'normalizado' ? 'normalizado' : 'capturado',
    pipelineStatus: computePublicationPipelineStatus({
      originStage: input.originStage,
      pipelineStatus: input.pipelineStatus,
    }),
    capturedAt: normalizeIsoDateTime(input.capturedAt) ?? new Date().toISOString(),
    occurredAt: normalizeIsoDateTime(input.occurredAt) ?? new Date().toISOString(),
    evidenceText: normalizeOptionalString(input.evidenceText) ?? '',
    normalizedText: normalizeOptionalString(input.normalizedText) ?? normalizeOptionalString(input.evidenceText) ?? '',
    tribunal: normalizeOptionalString(input.tribunal),
    processNumber: normalizeOptionalString(input.processNumber),
    cpfCnpj: normalizeOptionalString(input.cpfCnpj),
    oabNumber: normalizeOptionalString(input.oabNumber),
    personName: normalizeOptionalString(input.personName),
    consolidationStatus: computePublicationConsolidationStatus({
      originStage: input.originStage,
      pipelineStatus: input.pipelineStatus,
      consolidationStatus: input.consolidationStatus,
    }),
    metadata: input.metadata ?? {},
  };
}

export function buildPublicationNormalizedRecord(
  input: PublicationNormalizedEventSnapshot,
): PublicationNormalizedRecordContract {
  return {
    id: input.id ?? null,
    captureId: input.captureId,
    publicationId: input.publicationId ?? null,
    correlationId: input.correlationId ?? computePublicationCorrelationId({
      sourceType: input.sourceType ?? 'other',
      sourceReference: input.sourceReference ?? `capture:${input.captureId}`,
      occurredAt: input.eventAt,
      normalizedText: input.fullText,
    }),
    sourceType: normalizeSourceType(input.sourceType ?? 'other'),
    sourceReference: normalizeOptionalString(input.sourceReference) ?? `capture:${input.captureId}`,
    originStage: input.publicationId ? 'consolidado' : 'normalizado',
    pipelineStatus: computePublicationPipelineStatus({
      pipelineStatus: input.pipelineStatus,
      originStage: input.originStage ?? (input.publicationId ? 'consolidado' : 'normalizado'),
      eventId: input.id ?? input.captureId,
      publicationId: input.publicationId,
    }),
    title: normalizeOptionalString(input.title) ?? 'Evento normalizado',
    summary: normalizeOptionalString(input.summary) ?? normalizeOptionalString(input.fullText) ?? '',
    fullText: normalizeOptionalString(input.fullText) ?? '',
    riskLevel: normalizeRiskLevel(input.riskLevel),
    requiresAction: Boolean(input.requiresAction),
    eventAt: normalizeIsoDateTime(input.eventAt) ?? new Date().toISOString(),
  };
}

export function buildPublicationConsolidationStatus(
  input: PublicationConsolidationSnapshot,
): PublicationConsolidationStatusContract {
  return {
    correlationId: input.correlationId,
    captureId: input.captureId,
    eventId: input.eventId ?? null,
    publicationId: input.publicationId ?? null,
    status: computePublicationConsolidationStatus({
      consolidationStatus: input.status,
      eventId: input.eventId,
      publicationId: input.publicationId,
    }),
    publicationLabel: normalizeOptionalString(input.publicationLabel),
    lastUpdatedAt: normalizeIsoDateTime(input.lastUpdatedAt) ?? new Date().toISOString(),
  };
}

export function adaptLegacyPublicationCaptureRow(input: {
  id: number;
  correlationId?: string | null;
  sourceType: string;
  sourceReference: string;
  originStage?: string | null;
  pipelineStatus?: string | null;
  consolidationStatus?: string | null;
  capturedAt?: Date | string | null;
  occurredAt: Date | string;
  rawText?: string | null;
  normalizedText?: string | null;
  tribunal?: string | null;
  processNumber?: string | null;
  cpf?: string | null;
  oabNumber?: string | null;
  personName?: string | null;
  metadataJson?: Record<string, unknown> | null;
}) {
  return buildPublicationCaptureRecord({
    id: input.id,
    correlationId: input.correlationId,
    sourceType: input.sourceType,
    sourceReference: input.sourceReference,
    originStage: input.originStage,
    pipelineStatus: input.pipelineStatus,
    consolidationStatus: input.consolidationStatus,
    capturedAt: input.capturedAt,
    occurredAt: input.occurredAt,
    evidenceText: input.rawText,
    normalizedText: input.normalizedText,
    tribunal: input.tribunal,
    processNumber: input.processNumber,
    cpfCnpj: input.cpf,
    oabNumber: input.oabNumber,
    personName: input.personName,
    metadata: input.metadataJson ?? {},
  });
}

export function adaptLegacyPublicationEventRow(input: {
  id: number;
  captureId: number;
  publicationId?: number | null;
  correlationId?: string | null;
  sourceType?: string | null;
  sourceReference?: string | null;
  originStage?: string | null;
  pipelineStatus?: string | null;
  title: string;
  summary: string;
  fullText: string;
  riskLevel?: string | null;
  requiresAction?: boolean | null;
  eventAt: Date | string;
}) {
  return buildPublicationNormalizedRecord(input);
}
