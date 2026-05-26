import type { AiProvider } from '../core/ai-provider.port';
import { InMemoryAiIdempotencyAdapter } from '../core/ai-idempotency.adapter';
import type { AiRecommendationRequest, AiRecommendationResult } from '../core/ai-request.types';

function assertRecommendationInput(input: AiRecommendationRequest) {
  if (!input.targetType) {
    throw new Error('AI_INPUT_INVALID');
  }
  if (!input.facts || typeof input.facts !== 'object') {
    throw new Error('AI_INPUT_INVALID');
  }
}

export class TriageRecommendationService {
  constructor(
    private readonly provider: AiProvider,
    private readonly idempotency = new InMemoryAiIdempotencyAdapter<AiRecommendationResult>(),
  ) {}

  async recommend(input: AiRecommendationRequest) {
    assertRecommendationInput(input);
    return this.idempotency.run(input.correlationId ?? null, input, () => this.provider.recommend(input));
  }
}
