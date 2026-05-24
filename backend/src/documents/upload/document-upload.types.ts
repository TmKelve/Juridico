import type { CrmAuditActor } from '../../crm/audit';

export interface DocumentUploadFileInput {
  fileName: string;
  contentBase64: string;
  mimeType?: string | null;
  sizeInBytes?: number | null;
}

export interface DocumentUploadMetadata {
  proceduralType?: string | null;
  documentType?: string | null;
  checklistCode?: string | null;
  tags?: string[];
  [key: string]: unknown;
}

export interface DocumentUploadInput {
  processId: number;
  title: string;
  description?: string | null;
  category?: string | null;
  status?: string | null;
  origin?: string | null;
  responsible?: string | null;
  requiredChecklist?: boolean;
  pendingForAdvance?: boolean;
  previewUrl?: string | null;
  createdBy?: string | null;
  actor: CrmAuditActor;
  file: DocumentUploadFileInput;
  metadata: DocumentUploadMetadata;
}

export interface StoredDocumentFile {
  storageKey: string;
  mimeType: string;
  sizeInBytes: number;
  checksum?: string | null;
  previewUrl?: string | null;
}

export interface DocumentUploadProcessContext {
  id: number;
  proceduralType?: string | null;
}

export interface UploadedDocumentRecord {
  id: number;
  processId: number;
  title: string;
  status: string;
  category: string;
  version: number;
  isLatestVersion: boolean;
  mimeType: string;
  previewUrl: string | null;
  metadata: DocumentUploadMetadata;
  storage: StoredDocumentFile;
}

export interface DocumentUploadStorageAdapter {
  store(input: {
    processId: number;
    fileName: string;
    contentBase64: string;
    mimeType: string;
    sizeInBytes: number;
    metadata: DocumentUploadMetadata;
  }): Promise<StoredDocumentFile>;
}

export interface DocumentUploadRepository {
  assertProcessExists(processId: number): Promise<DocumentUploadProcessContext | null>;
  createDocument(input: {
    processId: number;
    title: string;
    description: string;
    category: string;
    status: string;
    origin: string;
    responsible: string | null;
    requiredChecklist: boolean;
    pendingForAdvance: boolean;
    mimeType: string;
    previewUrl: string | null;
    createdBy: string | null;
    metadata: DocumentUploadMetadata;
    storage: StoredDocumentFile;
  }): Promise<UploadedDocumentRecord>;
}

export interface DocumentUploadResult {
  document: UploadedDocumentRecord;
}
