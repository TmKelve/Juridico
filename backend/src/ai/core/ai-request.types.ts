export const aiCommandKeys = [
  'ai.summary.generate',
  'ai.recommendation.generate',
] as const;

export type AiCommandKey = (typeof aiCommandKeys)[number];

export type AiExecutionMode = 'live' | 'fallback' | 'replayed';

export type AiProviderUsage = {
  tokenUsageInput: number;
  tokenUsageOutput: number;
  estimatedCostUsd: number;
  latencyMs: number;
};

export type AiProviderMeta = AiProviderUsage & {
  provider: string;
  modelVersion: string;
  promptVersion: string;
  mode: AiExecutionMode;
  correlationId?: string | null;
};

export type AiBaseRequest = {
  commandKey: AiCommandKey;
  promptVersion: string;
  modelVersion: string;
  correlationId?: string | null;
};

export type AiSummaryRequest = AiBaseRequest & {
  commandKey: 'ai.summary.generate';
  targetType: 'publication' | 'publication_event' | 'document' | 'triage_item';
  targetId: number | string;
  sourceText: string;
  processLabel?: string | null;
  clientLabel?: string | null;
};

export type AiSummaryResult = {
  title: string;
  summary: string;
  highlights: string[];
  requiresReview: boolean;
  meta: AiProviderMeta;
};

export type AiRecommendationAction =
  | 'criar_prazo'
  | 'criar_tarefa'
  | 'criar_oportunidade'
  | 'criar_lead'
  | 'revisar_manualmente';

export type AiRecommendationRequest = AiBaseRequest & {
  commandKey: 'ai.recommendation.generate';
  targetType: 'publication' | 'triage_item' | 'deadline' | 'task';
  targetId: number | string;
  policyProfile: 'default' | 'conservative' | 'deadline_sensitive';
  facts: Record<string, unknown>;
};

export type AiRecommendationResult = {
  action: AiRecommendationAction;
  rationale: string;
  confidenceBand: 'alta' | 'media' | 'baixa';
  confidenceScore: number;
  requiresHumanApproval: boolean;
  meta: AiProviderMeta;
};
