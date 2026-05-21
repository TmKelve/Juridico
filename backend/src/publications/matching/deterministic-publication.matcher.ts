import {
  ClientCandidate,
  LegacyTriageTarget,
  MatchedBy,
  MatchCandidate,
  MatchingResult,
  NormalizedPublicationInput,
  ProcessCandidate,
} from './types';

type ScoredCandidate = {
  processId: number | null;
  clientId: number | null;
  matchedBy: MatchedBy;
  score: number;
  reason: string;
};

function normalizeDigits(value?: string | null) {
  return (value ?? '').replace(/\D/g, '');
}

function normalizeText(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function pushCandidate(
  bucket: Map<string, ScoredCandidate>,
  candidate: ScoredCandidate,
) {
  const key = `${candidate.processId ?? 'null'}:${candidate.clientId ?? 'null'}:${candidate.matchedBy}`;
  const existing = bucket.get(key);
  if (!existing || candidate.score > existing.score) {
    bucket.set(key, candidate);
  }
}

function scoreProcesses(
  publication: NormalizedPublicationInput,
  processes: ProcessCandidate[],
  bucket: Map<string, ScoredCandidate>,
) {
  const processNumber = normalizeDigits(publication.processNumber);
  const cpfCnpj = normalizeDigits(publication.cpfCnpj);
  const oabNumber = normalizeText(publication.oabNumber);
  const clientName = normalizeText(publication.clientName);

  for (const process of processes) {
    if (processNumber && normalizeDigits(process.processNumber) === processNumber) {
      pushCandidate(bucket, {
        processId: process.id,
        clientId: process.clientId ?? null,
        matchedBy: 'processNumber',
        score: 100,
        reason: 'Numero de processo encontrado em cadastro ativo.',
      });
    }

    if (cpfCnpj && normalizeDigits(process.cpfCnpj) === cpfCnpj) {
      pushCandidate(bucket, {
        processId: process.id,
        clientId: process.clientId ?? null,
        matchedBy: 'cpf_cnpj',
        score: 96,
        reason: 'CPF/CNPJ vinculado ao processo corresponde ao documento normalizado.',
      });
    }

    if (oabNumber && normalizeText(process.oabNumber) === oabNumber) {
      pushCandidate(bucket, {
        processId: process.id,
        clientId: process.clientId ?? null,
        matchedBy: 'oab',
        score: 92,
        reason: 'OAB vinculada ao processo corresponde ao cadastro monitorado.',
      });
    }

    const processClientNames = [process.clientName, ...(process.clientAliases ?? [])]
      .map((value) => normalizeText(value))
      .filter(Boolean);

    if (clientName && processClientNames.includes(clientName)) {
      pushCandidate(bucket, {
        processId: process.id,
        clientId: process.clientId ?? null,
        matchedBy: 'clientName',
        score: 70,
        reason: 'Nome do cliente coincide com cadastro do processo.',
      });
    }
  }
}

function scoreClients(
  publication: NormalizedPublicationInput,
  clients: ClientCandidate[],
  bucket: Map<string, ScoredCandidate>,
) {
  const cpfCnpj = normalizeDigits(publication.cpfCnpj);
  const oabNumber = normalizeText(publication.oabNumber);
  const clientName = normalizeText(publication.clientName);

  for (const client of clients) {
    if (cpfCnpj && normalizeDigits(client.cpfCnpj) === cpfCnpj) {
      pushCandidate(bucket, {
        processId: client.activeProcessId ?? null,
        clientId: client.id,
        matchedBy: 'cpf_cnpj',
        score: client.activeProcessId ? 95 : 90,
        reason: 'CPF/CNPJ corresponde ao cadastro do cliente monitorado.',
      });
    }

    if (oabNumber && normalizeText(client.oabNumber) === oabNumber) {
      pushCandidate(bucket, {
        processId: client.activeProcessId ?? null,
        clientId: client.id,
        matchedBy: 'oab',
        score: client.activeProcessId ? 90 : 86,
        reason: 'OAB corresponde ao cadastro do cliente monitorado.',
      });
    }

    const clientNames = [client.name, ...(client.aliases ?? [])]
      .map((value) => normalizeText(value))
      .filter(Boolean);

    if (clientName && clientNames.includes(clientName)) {
      pushCandidate(bucket, {
        processId: client.activeProcessId ?? null,
        clientId: client.id,
        matchedBy: 'clientName',
        score: client.activeProcessId ? 68 : 62,
        reason: 'Nome do cliente coincide com cadastro conhecido.',
      });
    }
  }
}

function sortCandidates(candidates: ScoredCandidate[]) {
  const priority: Record<MatchedBy, number> = {
    processNumber: 0,
    cpf_cnpj: 1,
    oab: 2,
    clientName: 3,
    manual_review: 4,
  };

  return [...candidates].sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (priority[left.matchedBy] !== priority[right.matchedBy]) {
      return priority[left.matchedBy] - priority[right.matchedBy];
    }
    if ((left.processId ?? Number.MAX_SAFE_INTEGER) !== (right.processId ?? Number.MAX_SAFE_INTEGER)) {
      return (left.processId ?? Number.MAX_SAFE_INTEGER) - (right.processId ?? Number.MAX_SAFE_INTEGER);
    }
    return (left.clientId ?? Number.MAX_SAFE_INTEGER) - (right.clientId ?? Number.MAX_SAFE_INTEGER);
  });
}

function buildResult(candidates: ScoredCandidate[]): MatchingResult {
  if (!candidates.length) {
    return {
      matchStatus: 'unmatched',
      matchedBy: 'manual_review',
      processId: null,
      clientId: null,
      confidence: 'low',
      reasons: ['Nenhum processo ou cliente elegivel encontrado.'],
      candidates: [],
    };
  }

  const ordered = sortCandidates(candidates);
  const best = ordered[0];
  const sameScore = ordered.filter((candidate) => candidate.score === best.score);
  const hasConflict = sameScore.some((candidate) => candidate.processId !== best.processId || candidate.clientId !== best.clientId);
  const topCandidates: MatchCandidate[] = ordered.slice(0, 5).map((candidate) => ({
    processId: candidate.processId ?? undefined,
    clientId: candidate.clientId ?? undefined,
    score: candidate.score,
    reason: candidate.reason,
  }));

  if (hasConflict && best.score >= 90) {
    return {
      matchStatus: 'ambiguous',
      matchedBy: 'manual_review',
      processId: null,
      clientId: null,
      confidence: 'low',
      reasons: ['Mais de um candidato valido encontrado com a mesma prioridade deterministica.'],
      candidates: topCandidates,
    };
  }

  if (best.score >= 90) {
    return {
      matchStatus: 'matched',
      matchedBy: best.matchedBy,
      processId: best.processId,
      clientId: best.clientId,
      confidence: 'high',
      reasons: [best.reason],
      candidates: topCandidates.slice(1),
    };
  }

  if (best.score >= 65) {
    return {
      matchStatus: 'partial',
      matchedBy: best.matchedBy,
      processId: best.processId,
      clientId: best.clientId,
      confidence: 'medium',
      reasons: [best.reason, 'Match parcial; recomendado manter revisao operacional antes da automacao.'],
      candidates: topCandidates,
    };
  }

  return {
    matchStatus: 'unmatched',
    matchedBy: 'manual_review',
    processId: null,
    clientId: null,
    confidence: 'low',
    reasons: ['Foram encontrados apenas sinais fracos de correlacao; nenhuma vinculação segura foi assumida.'],
    candidates: topCandidates,
  };
}

export function matchPublicationDeterministically(
  publication: NormalizedPublicationInput,
  processes: ProcessCandidate[],
  clients: ClientCandidate[],
): MatchingResult {
  const bucket = new Map<string, ScoredCandidate>();
  scoreProcesses(publication, processes, bucket);
  scoreClients(publication, clients, bucket);
  return buildResult([...bucket.values()]);
}

export function toLegacyTriageTarget(result: MatchingResult): LegacyTriageTarget {
  if (result.processId) {
    return {
      kind: 'process',
      processId: result.processId,
      clientId: result.clientId,
    };
  }

  if (result.clientId) {
    return {
      kind: 'client',
      processId: null,
      clientId: result.clientId,
    };
  }

  return {
    kind: 'orphan',
    processId: null,
    clientId: null,
  };
}
