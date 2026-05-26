import { createAiProviderFromEnv } from '../core/ai-provider.router';
import { TriageRecommendationService } from './triage-recommendation.service';

export type LegacyTriageAiInput = {
  sourceType: string;
  normalizedText: string;
  processTitle?: string | null;
  clientName?: string | null;
  historicalEvents?: Array<{ title: string; summary: string; riskLevel?: string | null }>;
  processId?: number | null;
  clientId?: number | null;
  hasExistingClient: boolean;
};

export type LegacyTriageAiResult = {
  queueType: 'critica' | 'normal';
  suggestedAction: 'criar_prazo' | 'criar_tarefa' | 'criar_oportunidade' | 'criar_lead';
  aiConfidenceBand: 'alta' | 'media' | 'baixa';
  aiScoreRaw: number;
  suggestedReason: string;
};

function extractRiskLevel(input: LegacyTriageAiInput) {
  const text = input.normalizedText.toLowerCase();
  if (text.includes('sentença') || text.includes('sentenca') || text.includes('prazo recursal')) return 'critico';
  if (text.includes('manifestação') || text.includes('manifestacao') || text.includes('prazo')) return 'alto';
  const historicalCritical = input.historicalEvents?.some((item) => String(item.riskLevel ?? '').toLowerCase() === 'critico');
  return historicalCritical ? 'critico' : 'medio';
}

function mapActionToLegacy(action: string): LegacyTriageAiResult['suggestedAction'] {
  if (action === 'criar_prazo' || action === 'criar_tarefa' || action === 'criar_oportunidade' || action === 'criar_lead') {
    return action;
  }
  return 'criar_tarefa';
}

export async function adaptTriageRecommendation(input: LegacyTriageAiInput): Promise<LegacyTriageAiResult> {
  const service = new TriageRecommendationService(createAiProviderFromEnv());
  const riskLevel = extractRiskLevel(input);
  const result = await service.recommend({
    commandKey: 'ai.recommendation.generate',
    promptVersion: 'k-triage-v1',
    modelVersion: 'k-triage-model-v1',
    correlationId: input.processId || input.clientId ? `triage:${input.processId ?? 'na'}:${input.clientId ?? 'na'}` : null,
    targetType: 'triage_item',
    targetId: input.processId ?? input.clientId ?? input.normalizedText.slice(0, 24),
    policyProfile: riskLevel === 'critico' ? 'deadline_sensitive' : 'default',
    facts: {
      sourceType: input.sourceType,
      normalizedText: input.normalizedText,
      processId: input.processId ?? null,
      clientId: input.clientId ?? null,
      processTitle: input.processTitle ?? null,
      clientName: input.clientName ?? null,
      hasExistingClient: input.hasExistingClient,
      hasDeadlineRisk: riskLevel === 'critico' || riskLevel === 'alto',
      requiresAction: /prazo|manifesta|recurso|senten[cç]a/i.test(input.normalizedText),
      riskLevel,
    },
  });

  return {
    queueType: result.data.action === 'criar_prazo' ? 'critica' : 'normal',
    suggestedAction: mapActionToLegacy(result.data.action),
    aiConfidenceBand: result.data.confidenceBand,
    aiScoreRaw: result.data.confidenceScore,
    suggestedReason: result.data.rationale,
  };
}
