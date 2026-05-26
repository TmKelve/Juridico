import type { ApiOriginReference } from '../../api';

const STATUS_LABELS: Record<string, string> = {
  capturado: 'Capturado',
  normalizado: 'Normalizado',
  consolidado: 'Consolidado',
  triado: 'Triado',
  gerou_crm: 'Gerou CRM',
  gerou_prazo: 'Gerou prazo',
  gerou_tarefa: 'Gerou tarefa',
  descartado: 'Descartado',
  falhou: 'Falhou',
  reprocessado: 'Reprocessado',
  nao_consolidado: 'Nao consolidado',
  aguardando_consolidacao: 'Aguardando consolidacao',
  capture: 'Captura',
  publication: 'Publicacao',
  manual: 'Manual',
};

function prettifyToken(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatOriginLabel(value?: string | null) {
  if (!value) return 'Origem nao identificada';
  return STATUS_LABELS[value] ?? prettifyToken(value);
}

export function buildFallbackOriginReference(input: {
  source?: string | null;
  sourceLabel?: string | null;
  sourceReference?: string | null;
  originReference?: ApiOriginReference | null;
  correlationId?: string | null;
  captureId?: number | null;
  publicationId?: number | null;
  eventId?: number | null;
  originStage?: string | null;
  pipelineStatus?: string | null;
  consolidationStatus?: string | null;
}) {
  if (input.originReference) return input.originReference;

  const source = input.sourceLabel || input.source || '';
  if (!source && !input.correlationId && !input.captureId && !input.publicationId) return null;

  const normalizedSource = source.toLowerCase();
  const originKind = normalizedSource.includes('publica') ? 'publication' : normalizedSource.includes('manual') ? 'manual' : 'capture';
  return {
    correlationId: input.correlationId ?? '',
    sourceType: normalizedSource || 'other',
    sourceReference: input.sourceReference ?? source ?? '',
    originKind,
    originLabel: source || (originKind === 'publication' ? 'Publicacao operacional' : 'Captura monitorada'),
    originStage: input.originStage ?? input.pipelineStatus ?? 'capturado',
    consolidationStatus: input.consolidationStatus ?? 'nao_consolidado',
    captureId: input.captureId ?? null,
    eventId: input.eventId ?? null,
    publicationId: input.publicationId ?? null,
    pipelineStatus: input.pipelineStatus ?? null,
    evidenceUrl: null,
    publicationUrl: input.publicationId ? `/publicacoes-intimacoes?publicationId=${input.publicationId}` : null,
    timelineUrl: input.correlationId ? `/publicacoes-intimacoes?correlationId=${encodeURIComponent(input.correlationId)}` : null,
  } satisfies ApiOriginReference;
}

export function getStatusTone(value?: string | null) {
  switch (value) {
    case 'falhou':
    case 'descartado':
      return 'danger';
    case 'gerou_crm':
    case 'gerou_prazo':
    case 'gerou_tarefa':
    case 'consolidado':
      return 'success';
    case 'normalizado':
    case 'triado':
    case 'aguardando_consolidacao':
    case 'reprocessado':
      return 'warning';
    default:
      return 'neutral';
  }
}
