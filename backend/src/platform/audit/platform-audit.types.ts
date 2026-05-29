export const platformAuditStatuses = ['success', 'warning', 'error'] as const;

export type PlatformAuditStatus = (typeof platformAuditStatuses)[number];

export interface PlatformAuditEventInput {
  id?: string | null;
  companyId: number;
  actor: string;
  action: string;
  status: PlatformAuditStatus;
  occurredAt?: string | Date;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
}

export interface PlatformAuditEventRecord {
  id: string;
  companyId: number;
  actor: string;
  action: string;
  status: PlatformAuditStatus;
  occurredAt: string;
  context: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface PlatformAuditListQuery {
  companyId?: number;
  actor?: string;
  action?: string;
  from?: string | Date | null;
  to?: string | Date | null;
  limit?: number;
}

export interface PlatformAuditRepository {
  createEvent(event: PlatformAuditEventRecord): Promise<PlatformAuditEventRecord>;
  listEvents(query: PlatformAuditListQuery): Promise<PlatformAuditEventRecord[]>;
}

export interface PlatformAuditWriter {
  record(event: PlatformAuditEventInput): Promise<PlatformAuditEventRecord>;
}
