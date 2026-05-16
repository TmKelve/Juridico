export interface ExternalLookupProcess {
  processNumber: string;
  title: string;
  client: string;
  phase: string;
  status: string;
}

type RemotePayload = Record<string, unknown> | null | undefined;

function normalizeText(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function pickNested(payload: RemotePayload, key: string) {
  if (!payload || typeof payload !== 'object') return undefined;
  return payload[key];
}

export function normalizeExternalProcessPayload(payload: RemotePayload, processNumber: string): ExternalLookupProcess | null {
  if (!payload || typeof payload !== 'object') return null;

  const base = typeof payload.process === 'object' && payload.process ? (payload.process as Record<string, unknown>) : payload;

  const title = normalizeText(
    base.title ?? base.subject ?? base.caseTitle ?? base.nomeProcesso,
    '',
  );
  const client = normalizeText(
    base.client ?? base.clientName ?? base.poloAtivo ?? base.nomeParte ?? pickNested((base.party as RemotePayload) ?? null, 'name'),
    '',
  );
  const phase = normalizeText(
    base.phase ?? base.stage ?? base.currentPhase ?? base.fase,
    'Inicial',
  );
  const status = normalizeText(
    base.status ?? base.currentStatus ?? base.situacao,
    'ativo',
  );

  if (!title || !client) return null;

  return {
    processNumber,
    title,
    client,
    phase,
    status,
  };
}

export async function lookupExternalProcess(processNumber: string) {
  const baseUrl = process.env.PROCESS_LOOKUP_URL?.trim();
  if (!baseUrl) {
    return null;
  }

  const authToken = process.env.PROCESS_LOOKUP_TOKEN?.trim();
  const authHeader = process.env.PROCESS_LOOKUP_AUTH_HEADER?.trim() || 'Authorization';

  const url = new URL(baseUrl);
  url.searchParams.set('number', processNumber);

  const fetchFn = (globalThis as { fetch?: (input: string, init?: { headers?: Record<string, string> }) => Promise<{
    ok: boolean;
    status: number;
    json(): Promise<unknown>;
    text(): Promise<string>;
  }> }).fetch;

  if (!fetchFn) {
    throw new Error('Runtime sem suporte a fetch para integração de lookup');
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (authToken) {
    headers[authHeader] = authHeader.toLowerCase() === 'authorization' ? `Bearer ${authToken}` : authToken;
  }

  const response = await fetchFn(url.toString(), { headers });
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Lookup externo falhou com status ${response.status}${details ? `: ${details}` : ''}`);
  }

  const json = await response.json().catch(() => null);
  return normalizeExternalProcessPayload((json as RemotePayload) ?? null, processNumber);
}
