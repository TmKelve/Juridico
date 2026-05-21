import type { DeadlineActor, DeadlineAgendaEventCommand, DeadlineRecord, StoredIdempotencyRecord } from '../deadline-core.types';
import type { DeadlineAuditEvent } from '../deadline-audit.types';

export type DeadlineBulkAction =
  | {
      type: 'complete';
      deadlineIds: number[];
      reason?: string | null;
    }
  | {
      type: 'reopen';
      deadlineIds: number[];
      reason?: string | null;
    }
  | {
      type: 'reprioritize';
      deadlineIds: number[];
      priority: string;
    }
  | {
      type: 'reassign';
      deadlineIds: number[];
      responsible: string;
    }
  | {
      type: 'reschedule';
      deadlineIds: number[];
      dueDate: string;
    };

export interface DeadlineBulkActionRequest {
  idempotencyKey: string;
  actor: DeadlineActor;
  action: DeadlineBulkAction;
}

export interface DeadlineBulkActionItemResult {
  deadlineId: number;
  status: 'updated' | 'skipped' | 'failed';
  reason?: string;
  deadline: DeadlineRecord | null;
}

export interface DeadlineBulkActionResult {
  summary: {
    requested: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  items: DeadlineBulkActionItemResult[];
  auditEvents: DeadlineAuditEvent[];
  agendaEvents: DeadlineAgendaEventCommand[];
  idempotency: {
    key: string;
    status: 'completed' | 'replayed';
    replayed: boolean;
  };
}

export interface DeadlineBulkActionStore {
  listByIds(ids: number[]): Promise<DeadlineRecord[]>;
  save(deadline: DeadlineRecord): Promise<DeadlineRecord>;
  getIdempotency(key: string): Promise<StoredIdempotencyRecord<DeadlineBulkActionResult> | null>;
  saveIdempotency(record: StoredIdempotencyRecord<DeadlineBulkActionResult>): Promise<void>;
}
