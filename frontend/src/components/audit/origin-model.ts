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

export function formatSourceTypeLabel(value?: string | null) {
  if (!value) return 'Origem nao identificada';

  const normalized = value.toLowerCase();
  const labels: Record<string, string> = {
    cpf: 'CPF capturado',
    cnj: 'Processo CNJ capturado',
    diario: 'Diario Oficial',
    diario_oficial: 'Diario Oficial',
    oab: 'OAB monitorada',
    publication: 'Publicacao consolidada',
    publicacao: 'Publicacao consolidada',
    manual: 'Registro manual',
  };

  return labels[normalized] ?? prettifyToken(value);
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

export function buildOriginOperationalSummary(input: {
  originReference?: ApiOriginReference | null;
  sourceType?: string | null;
  pipelineStatus?: string | null;
  consolidationStatus?: string | null;
}) {
  const originKind = input.originReference?.originKind ?? 'capture';
  const sourceLabel = formatSourceTypeLabel(input.originReference?.sourceType || input.sourceType);
  const pipelineLabel = formatOriginLabel(input.pipelineStatus || input.originReference?.pipelineStatus || input.originReference?.originStage);
  const consolidationLabel = formatOriginLabel(input.consolidationStatus || input.originReference?.consolidationStatus);

  if (originKind === 'publication') {
    return {
      headline: 'Veio de publicacao consolidada',
      detail: `Este item ja esta apoiado em uma publicacao operacional pronta para consulta.`,
      nextStep: `Estagio atual: ${pipelineLabel}.`,
      sourceLabel,
      consolidationLabel,
    };
  }

  if (originKind === 'manual') {
    return {
      headline: 'Veio de registro manual',
      detail: 'Nao depende de captura automatica para justificar a entrada atual.',
      nextStep: `Estagio atual: ${pipelineLabel}.`,
      sourceLabel,
      consolidationLabel,
    };
  }

  if ((input.consolidationStatus || input.originReference?.consolidationStatus) === 'consolidado') {
    return {
      headline: 'Veio de captura e ja consolidou',
      detail: `O sinal inicial foi ${sourceLabel.toLowerCase()} e ja gerou uma publicacao consolidada.`,
      nextStep: `Estagio atual: ${pipelineLabel}.`,
      sourceLabel,
      consolidationLabel,
    };
  }

  return {
    headline: 'Veio de captura/sinal ainda nao consolidado',
    detail: `A origem real deste item e uma captura monitorada de ${sourceLabel.toLowerCase()}, nao uma publicacao pronta.`,
    nextStep: `Consolidacao: ${consolidationLabel}.`,
    sourceLabel,
    consolidationLabel,
  };
}
