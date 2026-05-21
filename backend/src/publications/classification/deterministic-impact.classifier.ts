import { ClassificationInput, ClassificationResult, LegacyTriageClassification } from './types';

type SignalRule = {
  signal: string;
  tokens: string[];
};

const CRITICAL_RULES: SignalRule[] = [
  { signal: 'prazo', tokens: ['prazo', '15 dias', '5 dias', '48 horas'] },
  { signal: 'recurso', tokens: ['recurso', 'recursal', 'contrarrazoes'] },
  { signal: 'manifestacao obrigatoria', tokens: ['manifestacao', 'manifestar', 'sob pena'] },
  { signal: 'sentenca', tokens: ['sentenca', 'sentença'] },
];

const HIGH_RULES: SignalRule[] = [
  { signal: 'citacao', tokens: ['citacao', 'citação'] },
  { signal: 'audiencia', tokens: ['audiencia', 'audiência'] },
  { signal: 'liminar', tokens: ['liminar', 'tutela de urgencia', 'tutela de urgência'] },
  { signal: 'bloqueio', tokens: ['bloqueio', 'penhora', 'sisbajud'] },
];

const MEDIUM_RULES: SignalRule[] = [
  { signal: 'despacho', tokens: ['despacho'] },
  { signal: 'juntada', tokens: ['juntada', 'documento anexado'] },
  { signal: 'publicacao', tokens: ['publicacao', 'publicação'] },
];

function normalizeText(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function findSignals(text: string, rules: SignalRule[]) {
  return rules
    .filter((rule) => rule.tokens.some((token) => text.includes(normalizeText(token))))
    .map((rule) => rule.signal);
}

function buildReason(signals: string[], fallback: string) {
  return signals.length
    ? `Sinais determinísticos identificados: ${signals.join(', ')}.`
    : fallback;
}

export function classifyPublicationImpact(input: ClassificationInput): ClassificationResult {
  const text = normalizeText([input.summary, input.normalizedText].filter(Boolean).join(' '));
  const criticalSignals = findSignals(text, CRITICAL_RULES);
  const highSignals = findSignals(text, HIGH_RULES);
  const mediumSignals = findSignals(text, MEDIUM_RULES);

  if (criticalSignals.length) {
    return {
      impactLevel: 'critico',
      requiresTriage: true,
      requiresDeadline: input.matching.matchStatus === 'matched' && Boolean(input.matching.processId),
      requiresTask: true,
      queueType: 'critica',
      reason: buildReason(criticalSignals, 'Prazo crítico identificado no texto normalizado.'),
      signals: criticalSignals,
    };
  }

  if (highSignals.length) {
    return {
      impactLevel: 'alto',
      requiresTriage: true,
      requiresDeadline: false,
      requiresTask: Boolean(input.matching.processId),
      queueType: 'critica',
      reason: buildReason(highSignals, 'Evento relevante com potencial de impacto operacional alto.'),
      signals: highSignals,
    };
  }

  if (mediumSignals.length || input.matching.matchStatus === 'partial') {
    const signals = mediumSignals.length ? mediumSignals : ['match parcial'];
    return {
      impactLevel: 'medio',
      requiresTriage: true,
      requiresDeadline: false,
      requiresTask: Boolean(input.matching.processId),
      queueType: 'normal',
      reason: buildReason(signals, 'Evento monitorado com necessidade de conferência operacional.'),
      signals,
    };
  }

  return {
    impactLevel: 'baixo',
    requiresTriage: input.matching.matchStatus !== 'unmatched',
    requiresDeadline: false,
    requiresTask: false,
    queueType: 'normal',
    reason: 'Sem sinal de prazo, urgência ou comando operacional crítico no texto normalizado.',
    signals: [],
  };
}

function toLegacyConfidence(result: ClassificationResult, hasStrongMatch: boolean) {
  if (result.impactLevel === 'critico' && hasStrongMatch) return 'alta' as const;
  if (result.impactLevel === 'alto' || result.impactLevel === 'medio') return 'media' as const;
  return 'baixa' as const;
}

function toLegacyScore(result: ClassificationResult, hasStrongMatch: boolean) {
  if (result.impactLevel === 'critico') return hasStrongMatch ? 0.95 : 0.87;
  if (result.impactLevel === 'alto') return 0.8;
  if (result.impactLevel === 'medio') return 0.71;
  return 0.52;
}

export function toLegacyTriageClassification(input: ClassificationInput): LegacyTriageClassification {
  const classification = classifyPublicationImpact(input);
  const hasStrongMatch = input.matching.matchStatus === 'matched' && Boolean(input.matching.processId);

  let suggestedAction: LegacyTriageClassification['suggestedAction'] = 'criar_lead';
  if (classification.requiresDeadline && input.matching.processId) {
    suggestedAction = 'criar_prazo';
  } else if (classification.requiresTask && input.matching.processId) {
    suggestedAction = 'criar_tarefa';
  } else if (input.matching.clientId) {
    suggestedAction = 'criar_oportunidade';
  }

  return {
    queueType: classification.queueType === 'tratados' ? 'normal' : classification.queueType,
    suggestedAction,
    aiConfidenceBand: toLegacyConfidence(classification, hasStrongMatch),
    aiScoreRaw: toLegacyScore(classification, hasStrongMatch),
    suggestedReason: classification.reason,
  };
}
