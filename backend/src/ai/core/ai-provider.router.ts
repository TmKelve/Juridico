import type {
  AiRecommendationRequest,
  AiRecommendationResult,
  AiSummaryRequest,
  AiSummaryResult,
} from './ai-request.types';
import { DeterministicAiProvider, type AiProvider } from './ai-provider.port';

type RemoteFetcher = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

function getFetch() {
  return (globalThis as { fetch?: RemoteFetcher }).fetch;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

class RemoteAiProvider implements AiProvider {
  private readonly fallback = new DeterministicAiProvider();

  constructor(
    private readonly options: {
      baseUrl: string;
      authToken?: string | null;
      authHeader?: string | null;
      fetchFn: RemoteFetcher;
    },
  ) {}

  async summarize(input: AiSummaryRequest): Promise<AiSummaryResult> {
    const result = await this.callRemote<AiSummaryResult>(`${this.options.baseUrl}/summary`, input);
    return result ?? this.fallback.summarize(input);
  }

  async recommend(input: AiRecommendationRequest): Promise<AiRecommendationResult> {
    const result = await this.callRemote<AiRecommendationResult>(`${this.options.baseUrl}/recommendation`, input);
    return result ?? this.fallback.recommend(input);
  }

  private async callRemote<T>(url: string, payload: unknown): Promise<T | null> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (this.options.authToken) {
      const headerName = this.options.authHeader?.trim() || 'Authorization';
      headers[headerName] = headerName.toLowerCase() === 'authorization'
        ? `Bearer ${this.options.authToken}`
        : this.options.authToken;
    }

    try {
      const response = await this.options.fetchFn(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!response.ok) return null;
      const json = await response.json().catch(() => null);
      return isObject(json) ? json as T : null;
    } catch {
      return null;
    }
  }
}

export function createAiProviderFromEnv(): AiProvider {
  const baseUrl = process.env.AI_PROVIDER_URL?.trim();
  const fetchFn = getFetch();
  if (!baseUrl || !fetchFn) {
    return new DeterministicAiProvider();
  }

  return new RemoteAiProvider({
    baseUrl,
    authToken: process.env.AI_PROVIDER_TOKEN?.trim() || null,
    authHeader: process.env.AI_PROVIDER_AUTH_HEADER?.trim() || null,
    fetchFn,
  });
}
