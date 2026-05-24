import type { CrmAuditActor } from '../../crm/audit';
import type { DocumentUploadMetadata, StoredDocumentFile } from '../upload';

export interface DocumentVersionRecord {
  id: number;
  processId: number;
  title: string;
  description: string;
  status: string;
  category: string;
  version: number;
  isLatestVersion: boolean;
  origin: string;
  responsible: string | null;
  requiredChecklist: boolean;
  pendingForAdvance: boolean;
  mimeType: string;
  previewUrl: string | null;
  metadata: DocumentUploadMetadata;
  storage: Partial<StoredDocumentFile>;
}

export interface DocumentVersioningInput {
  documentId: number;
  actor: CrmAuditActor;
  changes?: {
    title?: string | null;
    description?: string | null;
    status?: string | null;
    category?: string | null;
    origin?: string | null;
    responsible?: string | null;
    requiredChecklist?: boolean;
    pendingForAdvance?: boolean;
    mimeType?: string | null;
    previewUrl?: string | null;
    metadata?: Record<string, unknown>;
    storage?: Partial<StoredDocumentFile>;
  };
}

export interface DocumentVersioningRepository {
  findById(documentId: number): Promise<DocumentVersionRecord | null>;
  createNextVersion(input: Omit<DocumentVersionRecord, 'id' | 'isLatestVersion'> & { isLatestVersion?: boolean }): Promise<DocumentVersionRecord>;
}
