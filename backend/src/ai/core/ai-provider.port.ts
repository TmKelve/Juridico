import type {
  AiRecommendationRequest,
  AiRecommendationResult,
  AiSummaryRequest,
  AiSummaryResult,
} from './ai-request.types';

export interface AiProvider {
  summarize(input: AiSummaryRequest): Promise<AiSummaryResult>;
  recommend(input: AiRecommendationRequest): Promise<AiRecommendationResult>;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function splitSentences(value: string) {
  return normalizeWhitespace(value)
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function clip(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function buildUsage(inputLength: number, outputLength: number) {
  const tokenUsageInput = Math.max(1, Math.ceil(inputLength / 4));
  const tokenUsageOutput = Math.max(1, Math.ceil(outputLength / 4));
  const estimatedCostUsd = Number(((tokenUsageInput + tokenUsageOutput) * 0.000002).toFixed(6));
  return {
    tokenUsageInput,
    tokenUsageOutput,
    estimatedCostUsd,
  };
}

export class DeterministicAiProvider implements AiProvider {
  constructor(private readonly providerName = 'deterministic-fallback') {}

  async summarize(input: AiSummaryRequest): Promise<AiSummaryResult> {
    const startedAt = Date.now();
    const sentences = splitSentences(input.sourceText);
    const highlights = sentences.slice(0, 3).map((item) => clip(item, 120));
    const summarySeed = highlights.join(' ');
    const summary = clip(summarySeed || normalizeWhitespace(input.sourceText), 320);
    const title = clip(
      [
        input.targetType === 'publication' || input.targetType === 'publication_event' ? 'Resumo de publicacao' : 'Resumo documental',
        input.processLabel ? `- ${input.processLabel}` : '',
      ].join(' ').trim(),
      80,
    );
    const usage = buildUsage(input.sourceText.length, summary.length);

    return {
      title,
      summary,
      highlights,
      requiresReview: true,
      meta: {
        provider: this.providerName,
        modelVersion: input.modelVersion,
        promptVersion: input.promptVersion,
        mode: 'fallback',
        correlationId: input.correlationId ?? null,
        latencyMs: Math.max(1, Date.now() - startedAt),
        ...usage,
      },
    };
  }

  async recommend(input: AiRecommendationRequest): Promise<AiRecommendationResult> {
    const startedAt = Date.now();
    const normalizedFacts = input.facts ?? {};
    const riskLevel = String(normalizedFacts.riskLevel ?? normalizedFacts.impact ?? 'medio').toLowerCase();
    const requiresAction = Boolean(normalizedFacts.requiresAction ?? normalizedFacts.hasDeadlineRisk ?? false);
    const hasExistingClient = Boolean(normalizedFacts.hasExistingClient ?? normalizedFacts.clientId ?? false);
    const hasProcess = Boolean(normalizedFacts.processId ?? false);

    let action: AiRecommendationResult['action'] = 'revisar_manualmente';
    let confidenceBand: AiRecommendationResult['confidenceBand'] = 'baixa';
    let confidenceScore = 0.42;

    if (riskLevel === 'critico' || input.policyProfile === 'deadline_sensitive') {
      action = 'criar_prazo';
      confidenceBand = 'alta';
      confidenceScore = 0.91;
    } else if (requiresAction || hasProcess) {
      action = 'criar_tarefa';
      confidenceBand = 'media';
      confidenceScore = 0.78;
    } else if (hasExistingClient) {
      action = 'criar_oportunidade';
      confidenceBand = 'media';
      confidenceScore = 0.67;
    } else {
      action = 'criar_lead';
      confidenceBand = 'baixa';
      confidenceScore = 0.55;
    }

    const rationale = clip(
      `Regra deterministica aplicada com profile ${input.policyProfile}, riskLevel ${riskLevel}, process=${hasProcess}, client=${hasExistingClient}, requiresAction=${requiresAction}.`,
      320,
    );
    const usage = buildUsage(JSON.stringify(normalizedFacts).length, rationale.length);

    return {
      action,
      rationale,
      confidenceBand,
      confidenceScore,
      requiresHumanApproval: true,
      meta: {
        provider: this.providerName,
        modelVersion: input.modelVersion,
        promptVersion: input.promptVersion,
        mode: 'fallback',
        correlationId: input.correlationId ?? null,
        latencyMs: Math.max(1, Date.now() - startedAt),
        ...usage,
      },
    };
  }
}
