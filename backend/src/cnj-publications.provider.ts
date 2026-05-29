export interface CnjPublicationCandidate {
  processNumber: string;
  clientName: string;
  cpf?: string | null;
}

export interface CnjPublicationCapture {
  sourceReference: string;
  sourceUrl?: string | null;
  occurredAt: string;
  tribunal: string;
  processNumber: string;
  cpf?: string | null;
  personName?: string | null;
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

export function normalizeCnjPublicationPayload(payload: RemotePayload, fallbackCandidate?: CnjPublicationCandidate): CnjPublicationCapture | null {
  const processNumber = normalizeText(payload.processNumber ?? payload.numeroProcesso, fallbackCandidate?.processNumber ?? '');
  if (!processNumber) return null;

  const title = normalizeText(payload.title ?? payload.tipo ?? payload.eventType, 'Movimentação processual');
  const summary = normalizeText(payload.summary ?? payload.resumo ?? payload.text, title);
  const rawText = normalizeText(payload.rawText ?? payload.textoIntegral ?? payload.text, summary);
  const occurredAt = toIsoString(payload.occurredAt ?? payload.dataPublicacao ?? payload.dataHora, new Date().toISOString());

  return {
    sourceReference: normalizeText(payload.sourceReference ?? payload.id, `CNJ-${processNumber}-${occurredAt}`),
    sourceUrl: normalizeText(payload.sourceUrl ?? payload.publicationUrl ?? payload.url ?? payload.link, '') || null,
    occurredAt,
    tribunal: normalizeText(payload.tribunal ?? payload.court, 'CNJ'),
    processNumber,
    cpf: normalizeText(payload.cpf ?? payload.documento, fallbackCandidate?.cpf ?? '') || null,
    personName: normalizeText(payload.personName ?? payload.nomeParte, fallbackCandidate?.clientName ?? '') || null,
    title,
    summary,
    rawText,
  };
}

export async function collectCnjPublications(candidates: CnjPublicationCandidate[]) {
  const baseUrl = process.env.CNJ_PUBLICATIONS_URL?.trim();
  const authToken = process.env.CNJ_PUBLICATIONS_TOKEN?.trim();
  const authHeader = process.env.CNJ_PUBLICATIONS_AUTH_HEADER?.trim() || 'Authorization';
  const fetchFn = (globalThis as { fetch?: (input: string, init?: { headers?: Record<string, string> }) => Promise<{
    ok: boolean;
    status: number;
    json(): Promise<unknown>;
    text(): Promise<string>;
  }> }).fetch;

  if (baseUrl && fetchFn) {
    const url = new URL(baseUrl);
    for (const candidate of candidates) {
      url.searchParams.append('number', candidate.processNumber);
    }

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (authToken) {
      headers[authHeader] = authHeader.toLowerCase() === 'authorization' ? `Bearer ${authToken}` : authToken;
    }

    const response = await fetchFn(url.toString(), { headers });
    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(`Coleta CNJ falhou com status ${response.status}${details ? `: ${details}` : ''}`);
    }

    const json = await response.json().catch(() => []);
    const records = Array.isArray(json)
      ? json
      : Array.isArray((json as Record<string, unknown>)?.items)
        ? ((json as Record<string, unknown>).items as RemotePayload[])
        : [];

    return records
      .map((record) => {
        const processNumber = normalizeText(record.processNumber ?? record.numeroProcesso);
        const fallback = candidates.find((candidate) => candidate.processNumber === processNumber);
        return normalizeCnjPublicationPayload(record, fallback);
      })
      .filter((item): item is CnjPublicationCapture => Boolean(item));
  }

  const now = new Date();
  return candidates.flatMap((candidate, index) => {
    const baseAt = new Date(now);
    baseAt.setHours(6 + (index % 3) * 6, index * 7, 0, 0);

    if (index % 2 === 0) {
      return [{
        sourceReference: `CNJ-FALLBACK-${candidate.processNumber}-${baseAt.toISOString()}`,
        sourceUrl: null,
        occurredAt: baseAt.toISOString(),
        tribunal: 'CNJ',
        processNumber: candidate.processNumber,
        cpf: candidate.cpf ?? null,
        personName: candidate.clientName,
        title: 'Intimação para manifestação',
        summary: `Intimação com necessidade de manifestação no processo ${candidate.processNumber}.`,
        rawText: `Intimação para manifestação no prazo legal referente ao processo ${candidate.processNumber}, vinculado ao cliente ${candidate.clientName}.`,
      }];
    }

    return [{
      sourceReference: `CNJ-FALLBACK-${candidate.processNumber}-${baseAt.toISOString()}`,
      sourceUrl: null,
      occurredAt: baseAt.toISOString(),
      tribunal: 'CNJ',
      processNumber: candidate.processNumber,
      cpf: candidate.cpf ?? null,
      personName: candidate.clientName,
      title: 'Sentença publicada',
      summary: `Sentença publicada no processo ${candidate.processNumber}.`,
      rawText: `Sentença publicada com indício de prazo recursal para o processo ${candidate.processNumber}, cliente ${candidate.clientName}.`,
    }];
  });
}
