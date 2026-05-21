import type { DeadlineActor } from './deadline-core.types';
import type { DeadlineRiskEvaluation } from './deadline-risk.types';

export const deadlineAuditEventTypes = [
  'deadline_created_from_publication',
  'deadline_completed',
  'deadline_reopened',
  'deadline_rescheduled',
  'deadline_reassigned',
  'deadline_reprioritized',
  'deadline_agenda_sync_failed',
] as const;

export const deadlineAuditStatuses = ['success', 'warning', 'error'] as const;

export type DeadlineAuditEventType = typeof deadlineAuditEventTypes[number];
export type DeadlineAuditStatus = typeof deadlineAuditStatuses[number];

export interface DeadlineAuditEvent {
  eventType: DeadlineAuditEventType;
  status: DeadlineAuditStatus;
  deadlineId: number;
  processId: number | null;
  publicationId: number | null;
  occurredAt: string;
  actor: DeadlineActor;
  details: Record<string, unknown>;
}

export interface DeadlineCompletionAuditInput {
  actor: DeadlineActor;
  deadlineId: number;
  processId: number | null;
  publicationId: number | null;
  source: 'bulk_action' | 'manual' | 'automation';
  reason: string | null;
  occurredAt: string;
  risk: DeadlineRiskEvaluation;
}
