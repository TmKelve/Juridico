export const aiAuditStatuses = ['success', 'warning', 'error'] as const;
export type AiAuditStatus = (typeof aiAuditStatuses)[number];

export type AiAuditActionTaken = 'accepted' | 'edited' | 'rejected' | 'fallback' | 'error';

export interface AiAuditEventInput {
  executionId: string;
  commandKey: string;
  targetType: string;
  targetId: string;
  actionTaken: AiAuditActionTaken;
  actor: string;
  status: AiAuditStatus;
  promptVersion: string;
  modelVersion: string;
  provider: string;
  latencyMs?: number | null;
  estimatedCostUsd?: number | null;
  correlationId?: string | null;
  idempotencyKey?: string | null;
  notes?: string | null;
  details?: Record<string, unknown>;
  occurredAt: string;
}

export interface AiAuditEventRecord extends AiAuditEventInput {
  id: string;
  createdAt: string;
}

export interface AiAuditQuery {
  executionId?: string;
  commandKey?: string;
  targetType?: string;
  targetId?: string;
  actionTaken?: AiAuditActionTaken;
  status?: AiAuditStatus;
  correlationId?: string;
  limit?: number;
}
