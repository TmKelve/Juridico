import type { PublicationAuditActor, PublicationAuditEvent } from '../audit/publication-audit.types';

export type DeadLetterStatus = 'pending_reprocess' | 'reprocessed' | 'rejected';

export interface PublicationDeadLetterEntry {
  id: string;
  fingerprint: string;
  sourceType: string;
  publicationId: number | null;
  captureId: number | null;
  triageItemId: number | null;
  jobId: number | null;
  processId: number | null;
  failedEventType: PublicationAuditEvent['eventType'];
  failedAt: string;
  errorCode: string;
  errorMessage: string;
  stage: string;
  status: DeadLetterStatus;
  attemptCount: number;
  lastRequestedBy: PublicationAuditActor;
  lastRequestedAt: string;
  metadata: Record<string, unknown>;
}

export interface PublicationDeadLetterStore {
  save(entry: PublicationDeadLetterEntry): Promise<PublicationDeadLetterEntry>;
  list(): Promise<PublicationDeadLetterEntry[]>;
}

export interface PublicationReprocessRequest {
  failedEvent: PublicationAuditEvent;
  actor: PublicationAuditActor;
  reason: string;
}

export interface PublicationReprocessResult {
  deadLetter: PublicationDeadLetterEntry;
  auditEvents: PublicationAuditEvent[];
}
