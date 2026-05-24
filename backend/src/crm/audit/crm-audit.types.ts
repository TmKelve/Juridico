export const crmAuditStatuses = ['success', 'warning', 'error'] as const;
export const crmAuditSources = ['user', 'system', 'api'] as const;
export const crmAuditEntityTypes = [
  'crm_opportunity',
  'crm_contact_event',
  'crm_opportunity_document',
  'document',
  'crm_idempotency',
] as const;

export type CrmAuditStatus = typeof crmAuditStatuses[number];
export type CrmAuditSource = typeof crmAuditSources[number];
export type CrmAuditEntityType = typeof crmAuditEntityTypes[number];

export interface CrmAuditActor {
  source: CrmAuditSource;
  userId?: number | null;
  email?: string | null;
  role?: string | null;
}

export interface CrmAuditEventInput {
  scope: string;
  entityType: CrmAuditEntityType;
  entityId: number | null;
  action: string;
  status: CrmAuditStatus;
  summary: string;
  details?: Record<string, unknown>;
  actor: CrmAuditActor;
  occurredAt?: Date | string;
  correlationId?: string | null;
  idempotencyKey?: string | null;
}

export interface CrmAuditEventRecord {
  id: string;
  scope: string;
  entityType: CrmAuditEntityType;
  entityId: number | null;
  action: string;
  status: CrmAuditStatus;
  summary: string;
  details: Record<string, unknown>;
  actor: CrmAuditActor;
  occurredAt: string;
  correlationId: string | null;
  idempotencyKey: string | null;
  createdAt: string;
}

export interface CrmAuditQuery {
  scope?: string;
  entityType?: CrmAuditEntityType;
  entityId?: number;
  action?: string;
  status?: CrmAuditStatus;
  correlationId?: string;
  idempotencyKey?: string;
  limit?: number;
}

export interface CrmIdempotencyRecord {
  key: string;
  scope: string;
  entityType: CrmAuditEntityType;
  entityId: number | null;
  action: string;
  payloadHash: string;
  responseCode: number;
  responseBody: unknown;
  auditEventId?: string | null;
  createdAt: string;
}

export interface CrmAuditRepository {
  createEvent(event: CrmAuditEventRecord): Promise<CrmAuditEventRecord>;
  listEvents(query?: CrmAuditQuery): Promise<CrmAuditEventRecord[]>;
  findIdempotencyRecord(scope: string, key: string): Promise<CrmIdempotencyRecord | null>;
  saveIdempotencyRecord(record: CrmIdempotencyRecord): Promise<CrmIdempotencyRecord>;
}

export interface CrmIdempotentResult<T> {
  mode: 'created' | 'replayed';
  data: T;
  idempotencyKey: string | null;
}
