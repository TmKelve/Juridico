import type { CrmAuditActor, CrmAuditEventRecord } from '../audit';

export interface OpportunityContactHistoryInput {
  opportunityId: number;
  summary: string;
  kind?: string;
  nextContactAt?: string | null;
  occurredAt?: string | null;
  idempotencyKey?: string | null;
  actor: CrmAuditActor;
  metadata?: Record<string, unknown>;
}

export interface OpportunityContactContext {
  id: number;
  status: string;
  responsible?: string | null;
  lastContactAt?: Date | null;
  nextContactAt?: Date | null;
}

export interface OpportunityContactEventRecord {
  id: number;
  opportunityId: number;
  kind: string;
  summary: string;
  createdBy: string | null;
  createdAt: string;
}

export interface OpportunityContactHistoryResult {
  opportunityId: number;
  lastContactAt: string;
  nextContactAt: string | null;
  event: OpportunityContactEventRecord;
  auditEvent: CrmAuditEventRecord;
}

export interface OpportunityContactHistoryRepository {
  findOpportunityById(opportunityId: number): Promise<OpportunityContactContext | null>;
  appendContactEvent(input: {
    opportunityId: number;
    summary: string;
    kind: string;
    createdBy: string | null;
    eventCreatedAt: Date;
    opportunityLastContactAt: Date;
    opportunityNextContactAt: Date | null;
    metadata: Record<string, unknown>;
  }): Promise<OpportunityContactHistoryResult>;
}
