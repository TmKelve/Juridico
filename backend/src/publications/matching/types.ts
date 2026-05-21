export type PublicationSourceType = 'cnj' | 'cpf' | 'cnpj' | 'oab' | 'processo' | 'diario';

export type MatchingStatus = 'matched' | 'partial' | 'ambiguous' | 'unmatched';

export type MatchedBy = 'cpf_cnpj' | 'oab' | 'processNumber' | 'clientName' | 'manual_review';

export type MatchingConfidence = 'high' | 'medium' | 'low';

export interface NormalizedPublicationInput {
  sourceType: PublicationSourceType | string;
  sourceReference?: string | null;
  processNumber?: string | null;
  cpfCnpj?: string | null;
  oabNumber?: string | null;
  lawyerName?: string | null;
  clientName?: string | null;
  summary?: string | null;
  normalizedText?: string | null;
}

export interface ProcessCandidate {
  id: number;
  processNumber?: string | null;
  clientId?: number | null;
  clientName?: string | null;
  clientAliases?: string[] | null;
  cpfCnpj?: string | null;
  oabNumber?: string | null;
  active?: boolean | null;
}

export interface ClientCandidate {
  id: number;
  name: string;
  aliases?: string[] | null;
  cpfCnpj?: string | null;
  oabNumber?: string | null;
  activeProcessId?: number | null;
}

export interface MatchCandidate {
  processId?: number;
  clientId?: number;
  score: number;
  reason: string;
}

export interface MatchingResult {
  matchStatus: MatchingStatus;
  matchedBy: MatchedBy;
  processId: number | null;
  clientId: number | null;
  confidence: MatchingConfidence;
  reasons: string[];
  candidates: MatchCandidate[];
}

export interface LegacyTriageTarget {
  kind: 'process' | 'client' | 'orphan';
  processId: number | null;
  clientId: number | null;
}
