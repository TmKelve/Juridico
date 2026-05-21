export const publicationAuditEventTypes = [
  'ingestion_started',
  'publication_normalized',
  'matching_completed',
  'classification_completed',
  'triage_decision_recorded',
  'automation_executed',
  'automation_skipped_duplicate',
  'reprocess_requested',
  'reprocess_completed',
  'pipeline_failed',
] as const;

export const publicationAuditStatuses = ['success', 'warning', 'error'] as const;

export type PublicationAuditEventType = typeof publicationAuditEventTypes[number];
export type PublicationAuditStatus = typeof publicationAuditStatuses[number];

export type PublicationAuditActor = `user:${number}` | 'scheduler' | 'system';

export interface PublicationAuditEvent {
  eventType: PublicationAuditEventType;
  status: PublicationAuditStatus;
  publicationId?: number | null;
  captureId?: number | null;
  triageItemId?: number | null;
  jobId?: number | null;
  processId?: number | null;
  details: Record<string, unknown>;
  occurredAt: string;
  actor: PublicationAuditActor;
}

export interface PublicationAuditQuery {
  publicationId?: number;
  captureId?: number;
  triageItemId?: number;
  jobId?: number;
  processId?: number;
  eventType?: PublicationAuditEventType;
  status?: PublicationAuditStatus;
  limit?: number;
}

export interface PublicationAuditSink {
  append(event: PublicationAuditEvent): Promise<PublicationAuditEvent>;
  list(query?: PublicationAuditQuery): Promise<PublicationAuditEvent[]>;
}

export interface LegacyPublicationEventDraft {
  eventType: string;
  eventAt: Date;
  title: string;
  summary: string;
  fullText: string;
  riskLevel: string;
  requiresAction: boolean;
  processId: number | null;
  publicationId: number | null;
  captureId: number | null;
}
