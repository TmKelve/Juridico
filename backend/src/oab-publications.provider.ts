export interface OabPublicationCandidate {
  processId: number;
  processNumber: string;
  clientName: string;
  lawyerName: string;
  oabNumber: string;
}

export interface OabPublicationCapture {
  sourceReference: string;
  occurredAt: string;
  tribunal: string;
  processNumber: string;
  oabNumber: string;
  personName?: string | null;
  lawyerName?: string | null;
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

export function normalizeOabPublicationPayload(payload: RemotePayload, fallbackCandidate?: OabPublicationCandidate): OabPublicationCapture | null {
  const oabNumber = normalizeText(payload.oabNumber ?? payload.oab ?? payload.inscricaoOab, fallbackCandidate?.oabNumber ?? '');
  if (!oabNumber) return null;

  const processNumber = normalizeText(payload.processNumber ?? payload.numeroProcesso, fallbackCandidate?.processNumber ?? '');
  const title = normalizeText(payload.title ?? payload.tipo ?? payload.eventType, 'Publicação vinculada à OAB');
  const summary = normalizeText(payload.summary ?? payload.resumo ?? payload.text, title);
  const rawText = normalizeText(payload.rawText ?? payload.textoIntegral ?? payload.text, summary);
  const occurredAt = toIsoString(payload.occurredAt ?? payload.dataPublicacao ?? payload.dataHora, new Date().toISOString());

  return {
    sourceReference: normalizeText(payload.sourceReference ?? payload.id, `OAB-${oabNumber}-${occurredAt}`),
    occurredAt,
    tribunal: normalizeText(payload.tribunal ?? payload.court, 'OAB'),
    processNumber,
    oabNumber,
    personName: normalizeText(payload.personName ?? payload.nomeParte, fallbackCandidate?.clientName ?? '') || null,
    lawyerName: normalizeText(payload.lawyerName ?? payload.nomeAdvogado, fallbackCandidate?.lawyerName ?? '') || null,
    title,
    summary,
    rawText,
  };
}

export async function collectOabPublications(candidates: OabPublicationCandidate[]) {
  const baseUrl = process.env.OAB_PUBLICATIONS_URL?.trim();
  const authToken = process.env.OAB_PUBLICATIONS_TOKEN?.trim();
  const authHeader = process.env.OAB_PUBLICATIONS_AUTH_HEADER?.trim() || 'Authorization';
  const fetchFn = (globalThis as { fetch?: (input: string, init?: { headers?: Record<string, string> }) => Promise<{
    ok: boolean;
    status: number;
    json(): Promise<unknown>;
    text(): Promise<string>;
  }> }).fetch;

  if (baseUrl && fetchFn) {
    const url = new URL(baseUrl);
    for (const candidate of candidates) {
      url.searchParams.append('oab', candidate.oabNumber);
    }

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (authToken) {
      headers[authHeader] = authHeader.toLowerCase() === 'authorization' ? `Bearer ${authToken}` : authToken;
    }

    const response = await fetchFn(url.toString(), { headers });
    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(`Coleta OAB falhou com status ${response.status}${details ? `: ${details}` : ''}`);
    }

    const json = await response.json().catch(() => []);
    const records = Array.isArray(json)
      ? json
      : Array.isArray((json as Record<string, unknown>)?.items)
        ? ((json as Record<string, unknown>).items as RemotePayload[])
        : [];

    return records
      .map((record) => {
        const oabNumber = normalizeText(record.oabNumber ?? record.oab ?? record.inscricaoOab);
        const fallback = candidates.find((candidate) => candidate.oabNumber === oabNumber);
        return normalizeOabPublicationPayload(record, fallback);
      })
      .filter((item): item is OabPublicationCapture => Boolean(item));
  }

  const now = new Date();
  return candidates.map((candidate, index) => {
    const occurredAt = new Date(now);
    occurredAt.setHours(8 + (index % 3) * 3, 20 + index * 4, 0, 0);
    const urgent = index % 2 === 0;

    return {
      sourceReference: `OAB-FALLBACK-${candidate.oabNumber}-${occurredAt.toISOString()}`,
      occurredAt: occurredAt.toISOString(),
      tribunal: 'OAB',
      processNumber: candidate.processNumber,
      oabNumber: candidate.oabNumber,
      personName: candidate.clientName,
      lawyerName: candidate.lawyerName,
      title: urgent ? 'Intimação localizada por OAB' : 'Publicação acompanhada por OAB',
      summary: urgent
        ? `Intimação identificada para a OAB ${candidate.oabNumber} no processo ${candidate.processNumber}.`
        : `Publicação informativa acompanhada para a OAB ${candidate.oabNumber}.`,
      rawText: urgent
        ? `Intimação localizada para o advogado ${candidate.lawyerName}, OAB ${candidate.oabNumber}, vinculada ao processo ${candidate.processNumber}.`
        : `Publicação acompanhada para o advogado ${candidate.lawyerName}, OAB ${candidate.oabNumber}, sem urgência explícita.`,
    };
  });
}
