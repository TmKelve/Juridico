import { matchPublicationDeterministically } from './publications/matching';
import { toLegacyTriageClassification } from './publications/classification';
import { adaptTriageRecommendation } from './ai/recommendation/triage-recommendation.adapter';

export interface TriageAiInput {
  sourceType: string;
  normalizedText: string;
  processTitle?: string | null;
  clientName?: string | null;
  historicalEvents?: Array<{ title: string; summary: string; riskLevel?: string | null }>;
  processId?: number | null;
  clientId?: number | null;
  hasExistingClient: boolean;
}

export interface TriageAiResult {
  queueType: 'critica' | 'normal';
  suggestedAction: 'criar_prazo' | 'criar_tarefa' | 'criar_oportunidade' | 'criar_lead';
  aiConfidenceBand: 'alta' | 'media' | 'baixa';
  aiScoreRaw: number;
  suggestedReason: string;
}

type RemotePayload = Record<string, unknown>;

function buildFallbackClassification(input: TriageAiInput): TriageAiResult {
  const matching = matchPublicationDeterministically(
    {
      sourceType: input.sourceType,
      normalizedText: input.normalizedText,
      summary: input.normalizedText,
      clientName: input.clientName ?? null,
      processNumber: null,
      cpfCnpj: null,
      oabNumber: null,
    },
    input.processId
      ? [{
          id: input.processId,
          processNumber: null,
          clientId: input.clientId ?? null,
          clientName: input.clientName ?? input.processTitle ?? null,
          clientAliases: [],
          active: true,
        }]
      : [],
    input.clientId || input.hasExistingClient
      ? [{
          id: input.clientId ?? -1,
          name: input.clientName ?? 'Cliente identificado',
          aliases: [],
          activeProcessId: input.processId ?? null,
        }]
      : [],
  );

  const fallback = toLegacyTriageClassification({
    sourceType: input.sourceType,
    summary: input.normalizedText,
    normalizedText: input.normalizedText,
    clientName: input.clientName ?? null,
    matching: {
      ...matching,
      processId: input.processId ?? matching.processId,
      clientId: input.clientId ?? matching.clientId,
      matchStatus: input.processId ? 'matched' : input.clientId || input.hasExistingClient ? 'partial' : matching.matchStatus,
      matchedBy: input.processId ? 'processNumber' : input.clientId || input.hasExistingClient ? 'clientName' : matching.matchedBy,
    },
  });

  return fallback;
}

function normalizeRemoteClassification(payload: RemotePayload): TriageAiResult | null {
  const queueType = payload.queueType === 'critica' ? 'critica' : payload.queueType === 'normal' ? 'normal' : null;
  const suggestedAction = ['criar_prazo', 'criar_tarefa', 'criar_oportunidade', 'criar_lead'].includes(String(payload.suggestedAction))
    ? (payload.suggestedAction as TriageAiResult['suggestedAction'])
    : null;
  const aiConfidenceBand = payload.aiConfidenceBand === 'alta' || payload.aiConfidenceBand === 'media' || payload.aiConfidenceBand === 'baixa'
    ? payload.aiConfidenceBand as TriageAiResult['aiConfidenceBand']
    : null;
  const aiScoreRaw = typeof payload.aiScoreRaw === 'number' ? payload.aiScoreRaw : null;
  const suggestedReason = typeof payload.suggestedReason === 'string' && payload.suggestedReason.trim()
    ? payload.suggestedReason.trim()
    : null;

  if (!queueType || !suggestedAction || !aiConfidenceBand || aiScoreRaw === null || !suggestedReason) {
    return null;
  }

  return {
    queueType,
    suggestedAction,
    aiConfidenceBand,
    aiScoreRaw,
    suggestedReason,
  };
}

export async function classifyTriageItem(input: TriageAiInput): Promise<TriageAiResult> {
  const baseUrl = process.env.TRIAGE_AI_URL?.trim();
  const authToken = process.env.TRIAGE_AI_TOKEN?.trim();
  const authHeader = process.env.TRIAGE_AI_AUTH_HEADER?.trim() || 'Authorization';
  const fetchFn = (globalThis as { fetch?: (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
    ok: boolean;
    status: number;
    json(): Promise<unknown>;
    text(): Promise<string>;
  }> }).fetch;

  if (baseUrl && fetchFn) {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers[authHeader] = authHeader.toLowerCase() === 'authorization' ? `Bearer ${authToken}` : authToken;
    }

    const response = await fetchFn(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });

    if (response.ok) {
      const json = await response.json().catch(() => null);
      const normalized = json && typeof json === 'object' ? normalizeRemoteClassification(json as RemotePayload) : null;
      if (normalized) return normalized;
    }
  }

  try {
    return await adaptTriageRecommendation(input);
  } catch {
    return buildFallbackClassification(input);
  }
}
