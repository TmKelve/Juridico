import type { CrmAuditActor } from '../../crm/audit';
import type { ProceduralChecklistEvaluation } from '../checklist';

export type DocumentApprovalDecision = 'approved' | 'rejected';
export type DocumentApprovalDecisionAlias = DocumentApprovalDecision | 'aprovado' | 'rejeitado';

export interface DocumentApprovalInput {
  documentId: number;
  decision: DocumentApprovalDecisionAlias;
  reason?: string | null;
  actor: CrmAuditActor;
}

export interface DocumentApprovalRecord {
  id: number;
  processId: number;
  title: string;
  status: string;
  version: number;
  isLatestVersion: boolean;
  metadata?: Record<string, unknown>;
}

export interface DocumentDecisionRecord {
  documentId: number;
  status: string;
  decision: DocumentApprovalDecision;
  reason: string | null;
  decidedAt: string;
  checklist?: ProceduralChecklistEvaluation;
}

export interface DocumentApprovalRepository {
  findById(documentId: number): Promise<DocumentApprovalRecord | null>;
  saveDecision(input: {
    documentId: number;
    decision: DocumentApprovalDecision;
    status: string;
    reason: string | null;
    actor: CrmAuditActor;
    checklist?: ProceduralChecklistEvaluation;
  }): Promise<DocumentDecisionRecord>;
}
