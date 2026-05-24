import type { CrmAuditActor, CrmIdempotentResult, CrmIdempotencyRecord } from '../../crm/audit';
import type { DocumentAuditEventRecord } from '../audit';
import type { DocumentUploadMetadata, StoredDocumentFile } from '../upload';

export interface DocumentArtifactGenerateInput {
  templateId: number | string;
  processId: number;
  documentTitle: string;
  payload: Record<string, unknown>;
  persistAsDocument: boolean;
  actor: CrmAuditActor;
  idempotencyKey?: string | null;
  correlationId?: string | null;
  category?: string | null;
  origin?: string | null;
  createdBy?: string | null;
  occurredAt?: string;
}

export interface GeneratedArtifactFile {
  fileName: string;
  mimeType: string;
  contentBase64: string;
  previewUrl?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PersistedArtifactRecord {
  artifactId: string;
  templateId: string;
  processId: number;
  documentTitle: string;
  payloadChecksum: string;
  storage: StoredDocumentFile;
  documentId: number | null;
  generatedAt: string;
  metadata: DocumentUploadMetadata;
}

export interface PersistedArtifactDocument {
  id: number;
  processId: number;
  title: string;
  version: number;
  isLatestVersion: boolean;
  status: string;
  category: string;
  metadata: DocumentUploadMetadata;
  storage: StoredDocumentFile;
}

export interface DocumentArtifactGenerator {
  generate(input: {
    templateId: string;
    processId: number;
    documentTitle: string;
    payload: Record<string, unknown>;
  }): Promise<GeneratedArtifactFile>;
}

export interface DocumentArtifactStorageAdapter {
  store(input: {
    processId: number;
    fileName: string;
    mimeType: string;
    contentBase64: string;
    metadata: DocumentUploadMetadata;
  }): Promise<StoredDocumentFile>;
}

export interface DocumentArtifactsRepository {
  assertProcessExists(processId: number): Promise<boolean>;
  saveArtifactRecord(input: {
    templateId: string;
    processId: number;
    documentTitle: string;
    payloadChecksum: string;
    storage: StoredDocumentFile;
    documentId: number | null;
    generatedAt: string;
    metadata: DocumentUploadMetadata;
  }): Promise<PersistedArtifactRecord>;
  createDocument?(input: {
    processId: number;
    title: string;
    category: string;
    status: string;
    origin: string;
    mimeType: string;
    previewUrl: string | null;
    createdBy: string | null;
    metadata: DocumentUploadMetadata;
    storage: StoredDocumentFile;
  }): Promise<PersistedArtifactDocument>;
}

export interface DocumentArtifactAuditPort {
  record(event: {
    eventType: 'document_artifact_generated';
    entityType: 'document_artifact';
    entityId: number;
    documentId: number | null;
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

export interface DocumentArtifactsIdempotencyPort {
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

export interface DocumentArtifactGenerateResult {
  artifactId: string;
  documentId: number | null;
  storageKey: string;
  checksum: string;
  generatedAt: string;
  idempotent: boolean;
  auditEvent: DocumentAuditEventRecord | null;
}
