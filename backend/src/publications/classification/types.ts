import { MatchingResult, NormalizedPublicationInput } from '../matching';

export type ImpactLevel = 'critico' | 'alto' | 'medio' | 'baixo';

export type QueueType = 'critica' | 'normal' | 'tratados';

export interface ClassificationInput extends NormalizedPublicationInput {
  matching: MatchingResult;
}

export interface ClassificationResult {
  impactLevel: ImpactLevel;
  requiresTriage: boolean;
  requiresDeadline: boolean;
  requiresTask: boolean;
  queueType: QueueType;
  reason: string;
  signals: string[];
}

export interface LegacyTriageClassification {
  queueType: 'critica' | 'normal';
  suggestedAction: 'criar_prazo' | 'criar_tarefa' | 'criar_oportunidade' | 'criar_lead';
  aiConfidenceBand: 'alta' | 'media' | 'baixa';
  aiScoreRaw: number;
  suggestedReason: string;
}
