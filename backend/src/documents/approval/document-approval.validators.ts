import { CrmContractError } from '../../crm/audit';
import type { DocumentApprovalInput, DocumentApprovalDecision, DocumentApprovalDecisionAlias } from './document-approval.types';

function parsePositiveInteger(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new CrmContractError(`${field} inválido`, 400, 'VALIDATION_ERROR', { field });
  }

  return parsed;
}

function parseOptionalString(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new CrmContractError('Valor textual inválido', 400, 'VALIDATION_ERROR');
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseDecision(value: unknown): DocumentApprovalDecision {
  if (value === 'approved' || value === 'rejected') {
    return value;
  }
  if (value === 'aprovado') {
    return 'approved';
  }
  if (value === 'rejeitado') {
    return 'rejected';
  }

  throw new CrmContractError('decision inválida', 400, 'VALIDATION_ERROR', { field: 'decision' });
}

export function normalizeDocumentApprovalInput(input: Omit<DocumentApprovalInput, 'decision'> & { decision: DocumentApprovalDecisionAlias }) {
  const decision = parseDecision(input.decision);
  const reason = parseOptionalString(input.reason);
  if (decision === 'rejected' && !reason) {
    throw new CrmContractError('reason é obrigatório para rejeição', 400, 'VALIDATION_ERROR', { field: 'reason' });
  }

  return {
    documentId: parsePositiveInteger(input.documentId, 'documentId'),
    decision,
    reason,
    actor: input.actor,
  };
}
