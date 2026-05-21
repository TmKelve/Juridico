export interface PublicationLogContext {
  sourceType?: string;
  sourceReference?: string;
  fingerprint?: string;
  publicationId?: number | null;
  captureId?: number | null;
  triageItemId?: number | null;
  jobId?: number | null;
  processId?: number | null;
}

export interface PublicationLogRecord {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  context: PublicationLogContext;
  details: Record<string, unknown>;
}
