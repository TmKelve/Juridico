/**
 * DataJud CNJ API integration
 * Documentação: https://datajud-wiki.cnj.jus.br/
 *
 * A API DataJud é gratuita e fornecida pelo CNJ.
 * Para uso em produção, obtenha sua própria chave em:
 * https://www.cnj.jus.br/sistemas/datajud/
 */

import type { ExternalLookupProcess } from './process-lookup.provider';

const DATAJUD_BASE_URL = 'https://api-publica.datajud.cnj.jus.br';

// ── CNJ number format: NNNNNNN-DD.AAAA.J.TT.OOOO (20 digits total) ──────────

/**
 * Convert a digits-only process number (20 chars) to formatted CNJ string.
 * Input:  "00000010220208260001"
 * Output: "0000001-02.2020.8.26.0001"
 */
export function formatCnjNumber(digits: string): string | null {
  const d = digits.replace(/\D/g, '');
  if (d.length !== 20) return null;
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16, 20)}`;
}

/**
 * Map a CNJ process number to the correct DataJud Elasticsearch index.
 * Returns null for unsupported segments/tribunals.
 */
export function getTribunalIndex(digits: string): string | null {
  const d = digits.replace(/\D/g, '');
  if (d.length !== 20) return null;

  const segment = parseInt(d.slice(13, 14), 10);  // J field
  const tribunal = parseInt(d.slice(14, 16), 10); // TT field

  switch (segment) {
    case 1:
      return 'api_publica_stf';

    case 3:
      return 'api_publica_stj';

    case 4: {
      // Justiça Federal — TRFs
      const trf: Record<number, string> = {
        1: 'api_publica_trf1',
        2: 'api_publica_trf2',
        3: 'api_publica_trf3',
        4: 'api_publica_trf4',
        5: 'api_publica_trf5',
        6: 'api_publica_trf6',
      };
      return trf[tribunal] ?? null;
    }

    case 5: {
      // Justiça do Trabalho — TRTs + TST
      if (tribunal === 0) return 'api_publica_tst';
      return tribunal >= 1 && tribunal <= 24 ? `api_publica_trt${tribunal}` : null;
    }

    case 6: {
      // Justiça Eleitoral — TREs
      const tre: Record<number, string> = {
        1: 'api_publica_treac', 2: 'api_publica_treal', 3: 'api_publica_treap',
        4: 'api_publica_tream', 5: 'api_publica_treba', 6: 'api_publica_trece',
        7: 'api_publica_tredf', 8: 'api_publica_trees', 9: 'api_publica_trego',
        10: 'api_publica_trema', 11: 'api_publica_tremt', 12: 'api_publica_trems',
        13: 'api_publica_tremg', 14: 'api_publica_trepa', 15: 'api_publica_trepb',
        16: 'api_publica_trepr', 17: 'api_publica_trepe', 18: 'api_publica_trepi',
        19: 'api_publica_trerj', 20: 'api_publica_trern', 21: 'api_publica_trers',
        22: 'api_publica_trero', 23: 'api_publica_trerr', 24: 'api_publica_tresc',
        25: 'api_publica_trese', 26: 'api_publica_tresp', 27: 'api_publica_treto',
      };
      return tre[tribunal] ?? null;
    }

    case 7:
      return 'api_publica_stm';

    case 8: {
      // Justiça Estadual — TJs
      const tj: Record<number, string> = {
        1:  'api_publica_tjac', 2:  'api_publica_tjal', 3:  'api_publica_tjap',
        4:  'api_publica_tjam', 5:  'api_publica_tjba', 6:  'api_publica_tjce',
        7:  'api_publica_tjdft', 8:  'api_publica_tjes', 9:  'api_publica_tjgo',
        10: 'api_publica_tjma', 11: 'api_publica_tjmt', 12: 'api_publica_tjms',
        13: 'api_publica_tjmg', 14: 'api_publica_tjpa', 15: 'api_publica_tjpb',
        16: 'api_publica_tjpr', 17: 'api_publica_tjpe', 18: 'api_publica_tjpi',
        19: 'api_publica_tjrj', 20: 'api_publica_tjrn', 21: 'api_publica_tjrs',
        22: 'api_publica_tjro', 23: 'api_publica_tjrr', 24: 'api_publica_tjsc',
        25: 'api_publica_tjse', 26: 'api_publica_tjsp', 27: 'api_publica_tjto',
      };
      return tj[tribunal] ?? null;
    }

    default:
      return null;
  }
}

// ── Response types ────────────────────────────────────────────────────────────

interface DataJudParte {
  nome: string;
  tipo: string;  // 'Autor', 'Réu', 'Advogado', etc.
  polo: string;  // 'ativo', 'passivo', 'terceiro'
}

interface DataJudMovimento {
  nome: string;
  dataHora: string;
}

interface DataJudSource {
  numeroProcesso?: string;
  classe?: { nome?: string };
  assuntos?: Array<{ nome?: string }>;
  partes?: DataJudParte[];
  movimentos?: DataJudMovimento[];
  grau?: string; // 'G1', 'G2', 'G3', 'GR', 'SUP', 'ORIG'
  orgaoJulgador?: { nome?: string };
}

interface DataJudResponse {
  hits?: {
    hits?: Array<{ _source?: DataJudSource }>;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractClient(partes?: DataJudParte[]): string {
  if (!partes?.length) return '';

  const lawyerTypes = ['advogado', 'defensor', 'defensor público', 'procurador'];

  // Prefer polo ativo non-lawyer
  const author = partes.find(
    (p) =>
      p.polo?.toLowerCase() === 'ativo' &&
      !lawyerTypes.some((t) => p.tipo?.toLowerCase().includes(t)),
  );
  if (author?.nome) return author.nome;

  // Fallback: any non-lawyer
  const nonLawyer = partes.find(
    (p) => !lawyerTypes.some((t) => p.tipo?.toLowerCase().includes(t)),
  );
  return nonLawyer?.nome ?? partes[0]?.nome ?? '';
}

function extractPhase(movimentos?: DataJudMovimento[], grau?: string): string {
  if (movimentos?.length) {
    const sorted = [...movimentos].sort(
      (a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime(),
    );
    const latestName = sorted[0]?.nome?.trim();
    if (latestName) return latestName;
  }

  if (grau) {
    const grauMap: Record<string, string> = {
      G1: '1º Grau',
      G2: '2º Grau',
      G3: '3º Grau / Recursal',
      GR: 'Recursal',
      SUP: 'Superior',
      ORIG: 'Originária',
    };
    return grauMap[grau] ?? grau;
  }

  return 'Inicial';
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Look up a process in the DataJud CNJ API.
 *
 * @param digitsNumber   Process number with digits only (output of normalizeProcessNumber)
 * @param apiKey         DataJud API key (ApiKey scheme)
 * @returns              Normalized process data or null if not found
 * @throws               On network/HTTP errors (non-404)
 */
export async function lookupDataJud(
  digitsNumber: string,
  apiKey: string,
): Promise<ExternalLookupProcess | null> {
  const index = getTribunalIndex(digitsNumber);
  if (!index) return null; // Unrecognized tribunal or non-CNJ number

  const formatted = formatCnjNumber(digitsNumber);
  if (!formatted) return null;

  const url = `${DATAJUD_BASE_URL}/${index}/_search`;

  const fetchFn = (
    globalThis as { fetch?: (url: string, init?: RequestInit) => Promise<Response> }
  ).fetch;
  if (!fetchFn) throw new Error('Runtime sem suporte a fetch para DataJud');

  const response = await fetchFn(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `ApiKey ${apiKey}`,
    },
    body: JSON.stringify({
      query: { match: { numeroProcesso: formatted } },
      size: 1,
      _source: ['numeroProcesso', 'classe', 'assuntos', 'partes', 'movimentos', 'grau', 'orgaoJulgador'],
    }),
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `DataJud retornou status ${response.status}${text ? `: ${text.slice(0, 300)}` : ''}`,
    );
  }

  const json = (await response.json()) as DataJudResponse;
  const source = json?.hits?.hits?.[0]?._source;
  if (!source) return null;

  // Build title: "Classe — Assunto principal"
  const className = source.classe?.nome?.trim() ?? '';
  const firstSubject = source.assuntos?.[0]?.nome?.trim() ?? '';
  const title = firstSubject
    ? `${className} — ${firstSubject}`
    : className || `Processo ${formatted}`;

  const client = extractClient(source.partes);
  // DataJud sometimes omits partes — use a safe fallback
  const safeClient = client || source.orgaoJulgador?.nome || 'Parte não identificada';

  const phase = extractPhase(source.movimentos, source.grau);

  return {
    processNumber: formatted,
    title,
    client: safeClient,
    phase,
    status: 'ativo',
  };
}
