export const managementAuditScopes = ['task', 'attendance', 'team', 'portfolio', 'authz', 'productivity'] as const;
export const managementAuditStatuses = ['success', 'warning', 'error'] as const;

export type ManagementAuditScope = (typeof managementAuditScopes)[number];
export type ManagementAuditStatus = (typeof managementAuditStatuses)[number];
export type ManagementAuditActor = `user:${number}` | 'system' | 'scheduler';

export interface ManagementAuditEventInput {
  id?: string | null;
  scope: ManagementAuditScope;
  action: string;
  status: ManagementAuditStatus;
  entityType: string;
  entityId: number | string | null;
  actor: ManagementAuditActor;
  occurredAt: string | Date;
  context: Record<string, unknown>;
  diff?: Record<string, unknown> | null;
  idempotencyKey?: string | null;
  correlationId?: string | null;
}

export interface ManagementAuditEventRecord {
  id: string;
  scope: ManagementAuditScope;
  action: string;
  status: ManagementAuditStatus;
  entityType: string;
  entityId: string | null;
  actor: ManagementAuditActor;
  occurredAt: string;
  context: Record<string, unknown>;
  diff: Record<string, unknown> | null;
  idempotencyKey: string | null;
  correlationId: string | null;
  createdAt: string;
}

export interface ManagementAuditQuery {
  scope?: ManagementAuditScope;
  action?: string;
  status?: ManagementAuditStatus;
  entityType?: string;
  entityId?: string;
  actor?: ManagementAuditActor;
  idempotencyKey?: string;
  correlationId?: string;
  limit?: number;
}

export interface ManagementAuditIdempotencyRecord {
  key: string;
  scope: string;
  entityType: string;
  entityId: string | null;
  action: string;
  payloadHash: string;
  responseCode: number;
  responseBody: unknown;
  createdAt: string;
}

export interface ManagementAuditRepository {
  createEvent(event: ManagementAuditEventRecord): Promise<ManagementAuditEventRecord>;
  listEvents(query?: ManagementAuditQuery): Promise<ManagementAuditEventRecord[]>;
  findIdempotencyRecord(scope: string, key: string): Promise<ManagementAuditIdempotencyRecord | null>;
  saveIdempotencyRecord(record: ManagementAuditIdempotencyRecord): Promise<ManagementAuditIdempotencyRecord>;
}

export interface ManagementIdempotentResult<T> {
  mode: 'created' | 'replayed';
  data: T;
  idempotencyKey: string | null;
}
