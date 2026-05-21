export type PublicationSourceType = 'cnj' | 'cpf' | 'cnpj' | 'oab' | 'processo' | 'diario';
export type PublicationAuditStatus = 'success' | 'warning' | 'error';
export type PublicationOperation = 'create' | 'update';

export type PublicationCaptureRecord = {
  id?: number | null;
  fingerprint: string;
};

export type PublicationIngestionPayload = {
  sourceReference: string;
  occurredAt: string;
  capturedAt?: string | null;
  publicationType?: string | null;
  tribunal?: string | null;
  processNumber?: string | null;
  cpfCnpj?: string | null;
  oabNumber?: string | null;
  lawyerName?: string | null;
  personName?: string | null;
  clientName?: string | null;
  summary?: string | null;
  rawText: string;
  normalizedText?: string | null;
  metadata?: Record<string, unknown>;
  status?: 'novo' | 'processado' | 'falha' | 'reprocessado' | 'atualizado';
};

export type NormalizedPublication = {
  sourceType: PublicationSourceType;
  sourceReference: string;
  occurredAt: string;
  capturedAt: string;
  publicationType: string;
  tribunal: string | null;
  processNumber: string | null;
  cpfCnpj: string | null;
  oabNumber: string | null;
  lawyerName: string | null;
  clientName: string | null;
  summary: string;
  normalizedText: string;
  metadata: Record<string, unknown>;
  status: 'novo' | 'processado' | 'falha' | 'reprocessado' | 'atualizado';
  idempotencyKey: string;
};

export type PreparedPublicationCapture = {
  operation: PublicationOperation;
  fingerprint: string;
  normalizedPublication: NormalizedPublication;
  persistence: {
    sourceType: PublicationSourceType;
    sourceReference: string;
    occurredAt: Date;
    capturedAt: Date;
    tribunal: string | null;
    processNumber: string | null;
    cpfCnpj: string | null;
    oabNumber: string | null;
    lawyerName: string | null;
    personName: string | null;
    summary: string;
    rawText: string;
    normalizedText: string;
    metadataJson: Record<string, unknown>;
    fingerprint: string;
    status: 'processado' | 'atualizado';
  };
  audit: {
    eventType: 'publication_normalized';
    status: PublicationAuditStatus;
    actor: string;
    errorCode?: 'PUB_DUPLICATE';
    details: Record<string, unknown>;
  };
};

function normalizeText(value: string | null | undefined) {
  return (value ?? '').trim();
}

function normalizeHashValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function createPublicationFingerprint(parts: Array<string | number | null | undefined>) {
  return parts
    .map((part) => normalizeHashValue(String(part ?? '')))
    .join('|')
    .slice(0, 400);
}

export function createPublicationIdempotencyKey(input: {
  sourceType: PublicationSourceType;
  sourceReference: string;
  occurredAt: string;
  normalizedText: string;
}) {
  const normalizedHash = normalizeHashValue(input.normalizedText);
  return `${input.sourceType}|${input.sourceReference}|${input.occurredAt}|${normalizedHash}`;
}

export function buildNormalizedPublication(
  sourceType: PublicationSourceType,
  payload: PublicationIngestionPayload,
  capturedAt = payload.capturedAt ?? new Date().toISOString(),
) {
  const normalizedText = normalizeText(payload.normalizedText) || normalizeText(payload.rawText);
  const summary = normalizeText(payload.summary) || normalizedText;

  return {
    sourceType,
    sourceReference: payload.sourceReference,
    occurredAt: payload.occurredAt,
    capturedAt,
    publicationType: normalizeText(payload.publicationType) || 'outros',
    tribunal: normalizeText(payload.tribunal) || null,
    processNumber: normalizeText(payload.processNumber) || null,
    cpfCnpj: normalizeText(payload.cpfCnpj) || null,
    oabNumber: normalizeText(payload.oabNumber) || null,
    lawyerName: normalizeText(payload.lawyerName) || null,
    clientName: normalizeText(payload.clientName ?? payload.personName) || null,
    summary,
    normalizedText,
    metadata: payload.metadata ?? {},
    status: payload.status ?? 'novo',
    idempotencyKey: createPublicationIdempotencyKey({
      sourceType,
      sourceReference: payload.sourceReference,
      occurredAt: payload.occurredAt,
      normalizedText,
    }),
  } satisfies NormalizedPublication;
}

export function preparePublicationCapture(input: {
  sourceType: PublicationSourceType;
  triggeredBy: string;
  payload: PublicationIngestionPayload;
  existingCapture?: PublicationCaptureRecord | null;
}) {
  const normalizedPublication = buildNormalizedPublication(input.sourceType, input.payload);
  const fingerprint = input.existingCapture?.fingerprint ?? createPublicationFingerprint([
    input.sourceType,
    input.payload.sourceReference,
    input.payload.oabNumber ?? input.payload.processNumber ?? input.payload.cpfCnpj ?? input.payload.personName ?? '',
    input.payload.occurredAt,
    normalizedPublication.normalizedText,
  ]);
  const duplicate = Boolean(input.existingCapture);

  return {
    operation: duplicate ? 'update' : 'create',
    fingerprint,
    normalizedPublication,
    persistence: {
      sourceType: input.sourceType,
      sourceReference: input.payload.sourceReference,
      occurredAt: new Date(input.payload.occurredAt),
      capturedAt: new Date(normalizedPublication.capturedAt),
      tribunal: normalizedPublication.tribunal,
      processNumber: normalizedPublication.processNumber,
      cpfCnpj: normalizedPublication.cpfCnpj,
      oabNumber: normalizedPublication.oabNumber,
      lawyerName: normalizedPublication.lawyerName,
      personName: normalizedPublication.clientName,
      summary: normalizedPublication.summary,
      rawText: input.payload.rawText,
      normalizedText: normalizedPublication.normalizedText,
      metadataJson: {
        ...normalizedPublication.metadata,
        triggeredBy: input.triggeredBy,
        idempotencyKey: normalizedPublication.idempotencyKey,
      },
      fingerprint,
      status: duplicate ? 'atualizado' : 'processado',
    },
    audit: {
      eventType: 'publication_normalized',
      status: duplicate ? 'warning' : 'success',
      actor: input.triggeredBy,
      ...(duplicate ? { errorCode: 'PUB_DUPLICATE' as const } : {}),
      details: {
        sourceType: input.sourceType,
        sourceReference: input.payload.sourceReference,
        operation: duplicate ? 'update' : 'create',
        existingCaptureId: input.existingCapture?.id ?? null,
        idempotencyKey: normalizedPublication.idempotencyKey,
      },
    },
  } satisfies PreparedPublicationCapture;
}
