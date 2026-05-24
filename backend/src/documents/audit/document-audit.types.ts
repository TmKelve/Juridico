import type { CrmAuditActor, CrmAuditStatus, CrmAuditEventRecord } from '../../crm/audit';

export const documentAuditEventTypes = ['document_linked', 'document_artifact_generated'] as const;
export const documentAuditEntityTypes = ['document', 'document_link', 'document_artifact'] as const;

export type DocumentAuditEventType = typeof documentAuditEventTypes[number];
export type DocumentAuditEntityType = typeof documentAuditEntityTypes[number];

export interface DocumentAuditEvent {
  id?: string;
  scope?: string;
  eventType: DocumentAuditEventType;
  entityType: DocumentAuditEntityType;
  entityId: number | null;
  documentId: number | null;
  processId?: number | null;
  status: CrmAuditStatus;
  summary: string;
  details?: Record<string, unknown>;
  actor: CrmAuditActor;
  correlationId?: string | null;
  idempotencyKey?: string | null;
  occurredAt: string;
  createdAt?: string;
}

export interface DocumentAuditQuery {
  scope?: string;
  eventType?: DocumentAuditEventType;
  entityType?: DocumentAuditEntityType;
  entityId?: number;
  documentId?: number;
  processId?: number;
  status?: CrmAuditStatus;
  correlationId?: string;
  idempotencyKey?: string;
  limit?: number;
}

export interface DocumentAuditEventRecord extends DocumentAuditEvent {
  id: string;
  scope: string;
  details: Record<string, unknown>;
  correlationId: string | null;
  idempotencyKey: string | null;
  createdAt: string;
}

export interface DocumentAuditSink {
  append(event: DocumentAuditEventRecord): Promise<DocumentAuditEventRecord>;
  list(query?: DocumentAuditQuery): Promise<DocumentAuditEventRecord[]>;
}

export interface CrmCompatibleAuditService {
  record(input: {
    scope: string;
    entityType: CrmAuditEventRecord['entityType'];
    entityId: number | null;
    action: string;
    status: CrmAuditStatus;
    summary: string;
    details?: Record<string, unknown>;
    actor: CrmAuditActor;
    correlationId?: string | null;
    idempotencyKey?: string | null;
    occurredAt: string;
  }): Promise<CrmAuditEventRecord>;
  list(query?: {
    scope?: string;
    entityType?: CrmAuditEventRecord['entityType'];
    entityId?: number;
    action?: string;
    status?: CrmAuditStatus;
    correlationId?: string;
    idempotencyKey?: string;
    limit?: number;
  }): Promise<CrmAuditEventRecord[]>;
}
