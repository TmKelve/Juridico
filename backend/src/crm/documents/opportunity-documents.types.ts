import type { CrmAuditActor, CrmAuditEventRecord } from '../audit';

export interface OpportunityDocumentAttachInput {
  opportunityId: number;
  title: string;
  description?: string | null;
  category?: string | null;
  mimeType?: string | null;
  previewUrl?: string | null;
  responsible?: string | null;
  origin?: string | null;
  uploadedAt?: string | null;
  requiredChecklist?: boolean;
  pendingForAdvance?: boolean;
  createdBy?: string | null;
  externalDocumentId?: string | null;
  idempotencyKey?: string | null;
  actor: CrmAuditActor;
  metadata?: Record<string, unknown>;
}

export interface OpportunityDocumentContext {
  id: number;
  status: string;
  responsible?: string | null;
  convertedProcessId?: number | null;
}

export interface OpportunityAttachedDocument {
  attachmentId: number;
  opportunityId: number;
  documentId: number | null;
  title: string;
  category: string;
  status: string;
  mimeType: string;
  previewUrl: string | null;
  requiredChecklist: boolean;
  pendingForAdvance: boolean;
  uploadedAt: string;
  responsible: string | null;
  createdBy: string | null;
  externalDocumentId: string | null;
}

export interface OpportunityDocumentAttachResult {
  document: OpportunityAttachedDocument;
  auditEvent: CrmAuditEventRecord;
}

export interface OpportunityDocumentsRepository {
  findOpportunityById(opportunityId: number): Promise<OpportunityDocumentContext | null>;
  attachDocumentToOpportunity(input: {
    opportunityId: number;
    processId: number | null;
    title: string;
    description: string;
    category: string;
    mimeType: string;
    previewUrl: string | null;
    responsible: string | null;
    origin: string;
    uploadedAt: Date;
    requiredChecklist: boolean;
    pendingForAdvance: boolean;
    createdBy: string | null;
    externalDocumentId: string | null;
    metadata: Record<string, unknown>;
  }): Promise<OpportunityAttachedDocument>;
}
