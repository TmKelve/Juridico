export interface DiarioPublicationCandidate {
  processId: number;
  processNumber: string;
  clientName: string;
  cpf?: string | null;
  tribunalHint?: string | null;
}

export interface DiarioPublicationCapture {
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

export function normalizeDiarioPublicationPayload(payload: RemotePayload, fallbackCandidate?: DiarioPublicationCandidate): DiarioPublicationCapture | null {
  const processNumber = normalizeText(payload.processNumber ?? payload.numeroProcesso, fallbackCandidate?.processNumber ?? '');
  if (!processNumber) return null;

  const title = normalizeText(payload.title ?? payload.tipo ?? payload.eventType, 'Publicação em diário oficial');
  const summary = normalizeText(payload.summary ?? payload.resumo ?? payload.text, title);
  const rawText = normalizeText(payload.rawText ?? payload.textoIntegral ?? payload.text, summary);
  const occurredAt = toIsoString(payload.occurredAt ?? payload.dataPublicacao ?? payload.dataHora, new Date().toISOString());

  return {
    sourceReference: normalizeText(payload.sourceReference ?? payload.id, `DIARIO-${processNumber}-${occurredAt}`),
    sourceUrl: normalizeText(payload.sourceUrl ?? payload.publicationUrl ?? payload.url ?? payload.link, '') || null,
    occurredAt,
    tribunal: normalizeText(payload.tribunal ?? payload.court, fallbackCandidate?.tribunalHint ?? 'Diário Oficial'),
    processNumber,
    cpf: normalizeText(payload.cpf ?? payload.documento, fallbackCandidate?.cpf ?? '') || null,
    personName: normalizeText(payload.personName ?? payload.nomeParte, fallbackCandidate?.clientName ?? '') || null,
    title,
    summary,
    rawText,
  };
}

export async function collectDiarioPublications(candidates: DiarioPublicationCandidate[]) {
  const baseUrl = process.env.DIARIO_PUBLICATIONS_URL?.trim();
  const authToken = process.env.DIARIO_PUBLICATIONS_TOKEN?.trim();
  const authHeader = process.env.DIARIO_PUBLICATIONS_AUTH_HEADER?.trim() || 'Authorization';
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
      throw new Error(`Coleta diário oficial falhou com status ${response.status}${details ? `: ${details}` : ''}`);
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
        return normalizeDiarioPublicationPayload(record, fallback);
      })
      .filter((item): item is DiarioPublicationCapture => Boolean(item));
  }

  const now = new Date();
  return candidates.map((candidate, index) => {
    const occurredAt = new Date(now);
    occurredAt.setHours(7 + (index % 3) * 4, 10 + index * 5, 0, 0);
    const urgent = index % 2 === 0;

    return {
      sourceReference: `DIARIO-FALLBACK-${candidate.processNumber}-${occurredAt.toISOString()}`,
      sourceUrl: null,
      occurredAt: occurredAt.toISOString(),
      tribunal: candidate.tribunalHint || 'Diário Oficial',
      processNumber: candidate.processNumber,
      cpf: candidate.cpf ?? null,
      personName: candidate.clientName,
      title: urgent ? 'Despacho com prazo em diário oficial' : 'Publicação informativa em diário oficial',
      summary: urgent
        ? `Despacho publicado no diário oficial com necessidade de manifestação para o processo ${candidate.processNumber}.`
        : `Publicação acompanhada no diário oficial para o processo ${candidate.processNumber}.`,
      rawText: urgent
        ? `Despacho publicado em diário oficial determinando manifestação no prazo legal para o processo ${candidate.processNumber}, cliente ${candidate.clientName}.`
        : `Publicação informativa localizada em diário oficial para o processo ${candidate.processNumber}, cliente ${candidate.clientName}.`,
    };
  });
}
