import type { CrmAuditActor, CrmIdempotentResult, CrmIdempotencyRecord } from '../../crm/audit';
import type { DocumentAuditEventRecord } from '../audit';

export const documentLinkEntityTypes = ['process', 'deadline', 'attendance', 'triage_item', 'crm_opportunity'] as const;

export type DocumentLinkEntityType = typeof documentLinkEntityTypes[number];

export interface DocumentEntityLink {
  entityType: DocumentLinkEntityType;
  entityId: number;
  boundAt: string;
  boundBy: CrmAuditActor;
}

export interface DocumentLinkBindInput {
  documentId: number;
  processId?: number | null;
  deadlineId?: number | null;
  attendanceId?: number | null;
  triageItemId?: number | null;
  crmOpportunityId?: number | null;
  actor: CrmAuditActor;
  correlationId?: string | null;
  idempotencyKey?: string | null;
  occurredAt?: string;
}

export interface DocumentLinkTargetCheck {
  entityType: DocumentLinkEntityType;
  entityId: number;
}

export interface DocumentLinksDocumentRecord {
  id: number;
  processId?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface DocumentLinksRepository {
  findDocumentById(documentId: number): Promise<DocumentLinksDocumentRecord | null>;
  assertEntityExists(target: DocumentLinkTargetCheck): Promise<boolean>;
  listLinks(documentId: number): Promise<DocumentEntityLink[]>;
  saveLinks(input: { documentId: number; links: DocumentEntityLink[] }): Promise<DocumentEntityLink[]>;
}

export interface DocumentLinkAuditPort {
  record(event: {
    eventType: 'document_linked';
    entityType: 'document_link';
    entityId: number;
    documentId: number;
    processId?: number | null;
    status: 'success' | 'warning' | 'error';
    summary: string;
    details?: Record<string, unknown>;
    actor: CrmAuditActor;
    correlationId?: string | null;
    idempotencyKey?: string | null;
    occurredAt: string;
  }): Promise<DocumentAuditEventRecord>;
}

export interface DocumentLinksIdempotencyPort {
  runIdempotent<T>(input: {
    key?: string | null;
    scope: string;
    entityType: CrmIdempotencyRecord['entityType'];
    entityId: number | null;
    action: string;
    payload: unknown;
    responseCode?: number;
    execute: () => Promise<T>;
    onConflictMessage?: string;
  }): Promise<CrmIdempotentResult<T>>;
}

export interface DocumentLinkBindResult {
  documentId: number;
  links: DocumentEntityLink[];
  idempotent: boolean;
  auditEvents: DocumentAuditEventRecord[];
}
