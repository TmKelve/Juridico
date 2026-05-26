export const publicationOriginStages = ['capturado', 'normalizado', 'consolidado'] as const;
export const publicationPipelineStatuses = [
  'capturado',
  'normalizado',
  'consolidado',
  'triado',
  'gerou_crm',
  'gerou_prazo',
  'gerou_tarefa',
  'descartado',
  'falhou',
  'reprocessado',
] as const;
export const publicationConsolidationStatuses = [
  'nao_consolidado',
  'aguardando_consolidacao',
  'consolidado',
  'descartado',
  'falhou',
] as const;

export type PublicationOriginStage = typeof publicationOriginStages[number];
export type PublicationPipelineStatus = typeof publicationPipelineStatuses[number];
export type PublicationConsolidationStatus = typeof publicationConsolidationStatuses[number];

export type PublicationOriginSourceType =
  | 'cpf'
  | 'oab'
  | 'processo'
  | 'cnj'
  | 'diario'
  | 'manual'
  | 'other'
  | 'cnpj';

export type PublicationOriginSourceTypeLike = PublicationOriginSourceType | string;

export interface PublicationCorrelationSeed {
  sourceType: PublicationOriginSourceTypeLike;
  sourceReference: string;
  processNumber?: string | null;
  cpfCnpj?: string | null;
  oabNumber?: string | null;
  personName?: string | null;
  tribunal?: string | null;
  occurredAt?: string | Date | null;
  evidenceText?: string | null;
  normalizedText?: string | null;
}

export interface PublicationOriginStatusSeed {
  originStage?: string | null;
  pipelineStatus?: string | null;
  consolidationStatus?: string | null;
  discarded?: boolean | null;
  failed?: boolean | null;
  reprocessed?: boolean | null;
  triageItemId?: number | null;
  crmLeadId?: number | null;
  crmOpportunityId?: number | null;
  deadlineId?: number | null;
  taskId?: number | null;
  eventId?: number | null;
  publicationId?: number | null;
}
