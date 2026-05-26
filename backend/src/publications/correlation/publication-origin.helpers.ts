import {
  publicationConsolidationStatuses,
  publicationOriginStages,
  publicationPipelineStatuses,
  type PublicationConsolidationStatus,
  type PublicationOriginSourceTypeLike,
  type PublicationOriginStage,
  type PublicationPipelineStatus,
} from './publication-origin.types';

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeOptionalString(value: string | null | undefined) {
  if (typeof value !== 'string') return null;
  const normalized = normalizeWhitespace(value);
  return normalized || null;
}

export function normalizeSourceType(value: PublicationOriginSourceTypeLike) {
  const normalized = normalizeWhitespace(String(value ?? 'other')).toLowerCase();
  if (!normalized) return 'other';
  if (normalized === 'manual') return 'manual';
  if (normalized === 'cnpj') return 'cnpj';
  return normalized;
}

export function normalizeReferenceToken(value: string | null | undefined) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) return null;
  return normalized.toLowerCase();
}

export function normalizeDocumentToken(value: string | null | undefined) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) return null;
  return normalized.replace(/[^\da-z]/gi, '').toLowerCase() || null;
}

export function normalizePersonToken(value: string | null | undefined) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) return null;
  return normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function normalizeIsoDateTime(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function coerceOriginStage(value: string | null | undefined): PublicationOriginStage | null {
  if (!value) return null;
  return publicationOriginStages.includes(value as PublicationOriginStage)
    ? (value as PublicationOriginStage)
    : null;
}

export function coercePipelineStatus(value: string | null | undefined): PublicationPipelineStatus | null {
  if (!value) return null;
  return publicationPipelineStatuses.includes(value as PublicationPipelineStatus)
    ? (value as PublicationPipelineStatus)
    : null;
}

export function coerceConsolidationStatus(value: string | null | undefined): PublicationConsolidationStatus | null {
  if (!value) return null;
  return publicationConsolidationStatuses.includes(value as PublicationConsolidationStatus)
    ? (value as PublicationConsolidationStatus)
    : null;
}

export function buildReadableOriginLabel(input: {
  sourceType: PublicationOriginSourceTypeLike;
  sourceReference: string | null | undefined;
  tribunal?: string | null;
  processNumber?: string | null;
}) {
  const sourceType = normalizeSourceType(input.sourceType);
  const sourceReference = normalizeOptionalString(input.sourceReference);
  const tribunal = normalizeOptionalString(input.tribunal);
  const processNumber = normalizeOptionalString(input.processNumber);
  const parts = [
    sourceType.toUpperCase(),
    sourceReference,
    tribunal ? `tribunal ${tribunal}` : null,
    processNumber ? `processo ${processNumber}` : null,
  ].filter(Boolean);
  return parts.join(' - ') || 'Origem não identificada';
}

export function compareIsoDateTimeAsc(left: string, right: string) {
  return new Date(left).getTime() - new Date(right).getTime();
}
