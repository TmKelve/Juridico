import type { TriageDecisionItem } from '../decision-engine';

export type TriageDecisionConfidenceBand = 'alta' | 'media' | 'baixa';

export type ExplainableTriageItem = TriageDecisionItem & {
  aiConfidenceBand?: TriageDecisionConfidenceBand | null;
  aiScoreRaw?: number | null;
  priorityScore?: number | null;
  priorityReasons?: string[] | null;
  sourceType?: string | null;
  sourceReference?: string | null;
  capture: TriageDecisionItem['capture'] & {
    occurredAt?: Date | string | null;
  };
};

export type TriageExplanation = {
  summary: string;
  appliedRules: string[];
  matchedSignals: string[];
  confidenceBand: TriageDecisionConfidenceBand;
  priorityReasons: string[];
};

function normalizeText(value?: string | null) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

function dedupe(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeText(value))
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function inferConfidenceBand(item: ExplainableTriageItem): TriageDecisionConfidenceBand {
  if (item.aiConfidenceBand === 'alta' || item.aiConfidenceBand === 'media' || item.aiConfidenceBand === 'baixa') {
    return item.aiConfidenceBand;
  }
  if ((item.priorityScore ?? 0) >= 85 || item.queueType === 'critica') return 'alta';
  if ((item.priorityScore ?? 0) >= 60) return 'media';
  return 'baixa';
}

function buildAppliedRules(item: ExplainableTriageItem, decisionType: string) {
  return dedupe([
    `decision:${decisionType}`,
    `queue:${item.queueType}`,
    `suggested:${item.suggestedAction}`,
    item.processId ? 'target:process-linked' : 'target:manual-review',
    item.clientId ? 'target:client-linked' : null,
    item.event?.publicationId ? 'source:publication-event' : `source:${item.sourceType ?? 'triage'}`,
  ]);
}

function buildMatchedSignals(item: ExplainableTriageItem) {
  const captureText = normalizeText(item.capture.normalizedText);
  const excerpt = captureText ? captureText.slice(0, 120) : null;
  return dedupe([
    item.capture.sourceReference ?? item.sourceReference ?? null,
    item.event?.title ?? null,
    item.process?.phase ?? null,
    item.clientRecord?.name ?? item.process?.client ?? null,
    excerpt ? `texto:${excerpt}` : null,
  ]);
}

export function buildTriageExplanation(params: {
  triageItem: ExplainableTriageItem;
  decisionType: string;
  decisionReason?: string | null;
}) : TriageExplanation {
  const { triageItem, decisionType, decisionReason } = params;
  const confidenceBand = inferConfidenceBand(triageItem);
  const priorityReasons = dedupe([
    ...(triageItem.priorityReasons ?? []),
    triageItem.suggestedReason,
    decisionReason ?? null,
  ]);
  const clientLabel = triageItem.clientRecord?.name ?? triageItem.process?.client ?? 'cliente nao identificado';
  const summary = [
    `Decisao ${decisionType} para item ${triageItem.id}.`,
    `Acao sugerida: ${triageItem.suggestedAction}.`,
    `Fila ${triageItem.queueType} para ${clientLabel}.`,
  ].join(' ');

  return {
    summary,
    appliedRules: buildAppliedRules(triageItem, decisionType),
    matchedSignals: buildMatchedSignals(triageItem),
    confidenceBand,
    priorityReasons,
  };
}

