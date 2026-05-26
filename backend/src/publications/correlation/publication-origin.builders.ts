import {
  buildReadableOriginLabel,
  coerceConsolidationStatus,
  coerceOriginStage,
  coercePipelineStatus,
  normalizeDocumentToken,
  normalizeIsoDateTime,
  normalizeOptionalString,
  normalizePersonToken,
  normalizeReferenceToken,
  normalizeSourceType,
} from './publication-origin.helpers';
import type {
  PublicationConsolidationStatus,
  PublicationCorrelationSeed,
  PublicationOriginStatusSeed,
  PublicationPipelineStatus,
} from './publication-origin.types';

function buildCorrelationSignature(input: PublicationCorrelationSeed) {
  return [
    normalizeSourceType(input.sourceType),
    normalizeReferenceToken(input.sourceReference),
    normalizeDocumentToken(input.processNumber),
    normalizeDocumentToken(input.cpfCnpj),
    normalizeDocumentToken(input.oabNumber),
    normalizePersonToken(input.personName),
    normalizeReferenceToken(input.tribunal),
    normalizeIsoDateTime(input.occurredAt),
    normalizeReferenceToken(input.normalizedText ?? input.evidenceText),
  ]
    .filter(Boolean)
    .join('|');
}

function hashSignature(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function createPublicationCorrelationSignature(input: PublicationCorrelationSeed) {
  return buildCorrelationSignature(input).slice(0, 512);
}

export function computePublicationCorrelationId(input: PublicationCorrelationSeed) {
  const signature = createPublicationCorrelationSignature(input);
  const readableReference =
    normalizeDocumentToken(input.processNumber)
    ?? normalizeDocumentToken(input.cpfCnpj)
    ?? normalizeDocumentToken(input.oabNumber)
    ?? normalizeReferenceToken(input.sourceReference)
    ?? 'sem-referencia';
  return `pub-origin:${normalizeSourceType(input.sourceType)}:${readableReference}:${hashSignature(signature || readableReference)}`;
}

export function computePublicationPipelineStatus(input: PublicationOriginStatusSeed): PublicationPipelineStatus {
  const explicit = coercePipelineStatus(input.pipelineStatus);
  if (explicit) return explicit;
  if (input.discarded) return 'descartado';
  if (input.failed) return 'falhou';
  if (input.reprocessed) return 'reprocessado';
  if (input.taskId) return 'gerou_tarefa';
  if (input.deadlineId) return 'gerou_prazo';
  if (input.crmLeadId || input.crmOpportunityId) return 'gerou_crm';
  if (input.triageItemId) return 'triado';
  if (input.publicationId) return 'consolidado';
  const originStage = coerceOriginStage(input.originStage);
  if (originStage === 'consolidado') return 'consolidado';
  if (originStage === 'normalizado' || input.eventId) return 'normalizado';
  return 'capturado';
}

export function computePublicationConsolidationStatus(
  input: PublicationOriginStatusSeed,
): PublicationConsolidationStatus {
  const explicit = coerceConsolidationStatus(input.consolidationStatus);
  if (explicit) return explicit;
  if (input.discarded) return 'descartado';
  if (input.failed) return 'falhou';
  if (input.publicationId || coerceOriginStage(input.originStage) === 'consolidado') return 'consolidado';
  if (input.eventId || input.triageItemId || input.crmLeadId || input.crmOpportunityId || input.deadlineId || input.taskId) {
    return 'aguardando_consolidacao';
  }
  return 'nao_consolidado';
}

export function buildPublicationOriginSummary(input: {
  correlation?: PublicationCorrelationSeed;
  status?: PublicationOriginStatusSeed;
  occurredAt?: string | Date | null;
}) {
  const correlation = input.correlation;
  const status = input.status ?? {};
  const occurredAt = normalizeIsoDateTime(input.occurredAt ?? correlation?.occurredAt) ?? new Date().toISOString();
  const correlationId = correlation ? computePublicationCorrelationId(correlation) : null;

  return {
    correlationId,
    pipelineStatus: computePublicationPipelineStatus(status),
    consolidationStatus: computePublicationConsolidationStatus(status),
    occurredAt,
    originLabel: correlation
      ? buildReadableOriginLabel({
        sourceType: correlation.sourceType,
        sourceReference: correlation.sourceReference,
        tribunal: correlation.tribunal,
        processNumber: correlation.processNumber,
      })
      : 'Origem não identificada',
    sourceType: correlation ? normalizeSourceType(correlation.sourceType) : 'other',
    sourceReference: normalizeOptionalString(correlation?.sourceReference) ?? '',
  };
}
