import type { AiProvider } from '../core/ai-provider.port';
import { InMemoryAiIdempotencyAdapter } from '../core/ai-idempotency.adapter';
import type { AiSummaryRequest, AiSummaryResult } from '../core/ai-request.types';

function assertSummaryInput(input: AiSummaryRequest) {
  if (!String(input.sourceText ?? '').trim()) {
    throw new Error('AI_INPUT_INVALID');
  }
}

export class PublicationSummarizerService {
  constructor(
    private readonly provider: AiProvider,
    private readonly idempotency = new InMemoryAiIdempotencyAdapter<AiSummaryResult>(),
  ) {}

  async summarize(input: AiSummaryRequest) {
    assertSummaryInput(input);
    return this.idempotency.run(input.correlationId ?? null, input, () => this.provider.summarize(input));
  }
}
