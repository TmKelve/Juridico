export interface CpfPublicationCandidate {
  clientId: number;
  clientName: string;
  cpf: string;
  hasActiveProcess: boolean;
}

export interface CpfPublicationCapture {
  sourceReference: string;
  sourceUrl?: string | null;
  occurredAt: string;
  tribunal: string;
  cpf: string;
  personName: string;
  title: string;
  summary: string;
  rawText: string;
}

type RemotePayload = Record<string, unknown>;

function normalizeText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function toIsoString(value: unknown, fallback: string) {
  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return fallback;
}

export function normalizeCpfPublicationPayload(payload: RemotePayload, fallbackCandidate?: CpfPublicationCandidate): CpfPublicationCapture | null {
  const cpf = normalizeText(payload.cpf ?? payload.documento, fallbackCandidate?.cpf ?? '');
  if (!cpf) return null;

  const title = normalizeText(payload.title ?? payload.tipo ?? payload.eventType, 'Publicação vinculada a CPF');
  const summary = normalizeText(payload.summary ?? payload.resumo ?? payload.text, title);
  const rawText = normalizeText(payload.rawText ?? payload.textoIntegral ?? payload.text, summary);
  const occurredAt = toIsoString(payload.occurredAt ?? payload.dataPublicacao ?? payload.dataHora, new Date().toISOString());

  return {
    sourceReference: normalizeText(payload.sourceReference ?? payload.id, `CPF-${cpf}-${occurredAt}`),
    sourceUrl: normalizeText(payload.sourceUrl ?? payload.publicationUrl ?? payload.url ?? payload.link, '') || null,
    occurredAt,
    tribunal: normalizeText(payload.tribunal ?? payload.court, 'Diário Oficial'),
    cpf,
    personName: normalizeText(payload.personName ?? payload.nomeParte, fallbackCandidate?.clientName ?? 'Contato identificado'),
    title,
    summary,
    rawText,
  };
}

export async function collectCpfPublications(candidates: CpfPublicationCandidate[]) {
  const baseUrl = process.env.CPF_PUBLICATIONS_URL?.trim();
  const authToken = process.env.CPF_PUBLICATIONS_TOKEN?.trim();
  const authHeader = process.env.CPF_PUBLICATIONS_AUTH_HEADER?.trim() || 'Authorization';
  const fetchFn = (globalThis as { fetch?: (input: string, init?: { headers?: Record<string, string> }) => Promise<{
    ok: boolean;
    status: number;
    json(): Promise<unknown>;
    text(): Promise<string>;
  }> }).fetch;

  if (baseUrl && fetchFn) {
    const url = new URL(baseUrl);
    for (const candidate of candidates) {
      url.searchParams.append('cpf', candidate.cpf);
    }

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (authToken) {
      headers[authHeader] = authHeader.toLowerCase() === 'authorization' ? `Bearer ${authToken}` : authToken;
    }

    const response = await fetchFn(url.toString(), { headers });
    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(`Coleta CPF falhou com status ${response.status}${details ? `: ${details}` : ''}`);
    }

    const json = await response.json().catch(() => []);
    const records = Array.isArray(json)
      ? json
      : Array.isArray((json as Record<string, unknown>)?.items)
        ? ((json as Record<string, unknown>).items as RemotePayload[])
        : [];

    return records
      .map((record) => {
        const cpf = normalizeText(record.cpf ?? record.documento);
        const fallback = candidates.find((candidate) => candidate.cpf === cpf);
        return normalizeCpfPublicationPayload(record, fallback);
      })
      .filter((item): item is CpfPublicationCapture => Boolean(item));
  }

  const now = new Date();
  return candidates
    .filter((candidate) => !candidate.hasActiveProcess)
    .map((candidate, index) => {
      const occurredAt = new Date(now);
      occurredAt.setHours(6 + (index % 3) * 6, 15 + index * 3, 0, 0);
      return {
        sourceReference: `CPF-FALLBACK-${candidate.cpf}-${occurredAt.toISOString()}`,
        sourceUrl: null,
        occurredAt: occurredAt.toISOString(),
        tribunal: 'Diário Oficial',
        cpf: candidate.cpf,
        personName: candidate.clientName,
        title: 'Publicação localizada por CPF',
        summary: `CPF ${candidate.cpf} publicado sem processo ativo vinculado à carteira.`,
        rawText: `Foi identificada publicação associada ao CPF ${candidate.cpf}, pertencente a ${candidate.clientName}, sem processo ativo atualmente vinculado ao cliente.`,
      };
    });
}
