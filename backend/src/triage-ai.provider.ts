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
  const text = input.normalizedText.toLowerCase();
  const hasDeadlineSignal = ['prazo', 'manifestação', 'manifestacao', 'sentença', 'sentenca', 'intimação', 'intimacao', 'sob pena', 'recurso']
    .some((token) => text.includes(token));
  const hasUrgencySignal = ['urgente', 'citação', 'citacao', 'liminar', 'audiência', 'audiencia']
    .some((token) => text.includes(token));
  const hasHistoricalRisk = (input.historicalEvents ?? []).some((event) => (event.riskLevel ?? '').toLowerCase() === 'critico');

  const queueType = hasDeadlineSignal || hasUrgencySignal || hasHistoricalRisk ? 'critica' : 'normal';

  let suggestedAction: TriageAiResult['suggestedAction'] = 'criar_lead';
  if (input.processId && hasDeadlineSignal) {
    suggestedAction = 'criar_prazo';
  } else if (input.processId) {
    suggestedAction = 'criar_tarefa';
  } else if (input.clientId || input.hasExistingClient) {
    suggestedAction = 'criar_oportunidade';
  }

  const aiScoreRaw = queueType === 'critica'
    ? hasDeadlineSignal && (hasUrgencySignal || hasHistoricalRisk) ? 0.93 : 0.84
    : input.hasExistingClient ? 0.74 : 0.66;

  const aiConfidenceBand: TriageAiResult['aiConfidenceBand'] =
    aiScoreRaw >= 0.86 ? 'alta' : aiScoreRaw >= 0.72 ? 'media' : 'baixa';

  const reasonParts = [
    hasDeadlineSignal ? 'Texto com indício claro de prazo ou manifestação.' : null,
    hasUrgencySignal ? 'Há sinal de urgência jurídica no conteúdo.' : null,
    hasHistoricalRisk ? 'O histórico do processo já carrega evento crítico recente.' : null,
    !input.processId && input.hasExistingClient ? 'Sem processo ativo vinculado; oportunidade recomendada no CRM.' : null,
    !input.processId && !input.hasExistingClient ? 'Sem vínculo conhecido; lead recomendado para triagem comercial.' : null,
    input.processId && !hasDeadlineSignal ? 'Há vínculo com processo ativo, mas sem prazo explícito; tarefa operacional sugerida.' : null,
  ].filter(Boolean);

  return {
    queueType,
    suggestedAction,
    aiConfidenceBand,
    aiScoreRaw,
    suggestedReason: reasonParts.join(' ') || 'Classificação heurística aplicada com base no texto capturado e no contexto disponível.',
  };
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

  return buildFallbackClassification(input);
}
