export type TimeEntryStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'locked';
export type TimeEntrySource = 'manual' | 'mobile' | 'timer' | 'agenda';
export type TimeEntryActivityType =
  | 'analise'
  | 'peticao'
  | 'audiencia'
  | 'reuniao'
  | 'atendimento'
  | 'administrativo'
  | 'outro';

export interface TimeEntryRecord {
  id: string;
  userId: number;
  teamId: number | null;
  portfolioId: number | null;
  clientId: number | null;
  processId: number | null;
  taskId: number | null;
  attendanceId: number | null;
  agendaEventId: number | null;
  activityType: TimeEntryActivityType;
  source: TimeEntrySource;
  status: TimeEntryStatus;
  billable: boolean;
  durationMinutes: number;
  billableMinutes: number;
  startedAt: string;
  endedAt: string;
  notes: string | null;
  origin: string;
  createdByUserId: number | null;
  approvedByUserId: number | null;
  approvedAt: string | null;
  lockedAt: string | null;
  correlationId: string | null;
  idempotencyKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntryConflictRecord {
  id: string;
  entryId: string;
  conflictType: 'overlap' | 'period_closed' | 'linked_task_closed' | 'linked_attendance_cancelled';
  severity: 'warning' | 'error';
  fingerprint: string;
  details: Record<string, unknown>;
  resolvedAt: string | null;
  createdAt: string;
}

export interface CreateTimeEntryInput {
  userId: number;
  teamId?: number | null;
  portfolioId?: number | null;
  clientId?: number | null;
  processId?: number | null;
  taskId?: number | null;
  attendanceId?: number | null;
  agendaEventId?: number | null;
  activityType: TimeEntryActivityType;
  source: TimeEntrySource;
  startedAt: string;
  endedAt: string;
  billable: boolean;
  billableMinutes: number;
  notes?: string | null;
  origin?: string;
  createdByUserId?: number | null;
  correlationId?: string | null;
  idempotencyKey?: string | null;
}

export interface UpdateTimeEntryInput {
  entryId: string;
  startedAt?: string | null;
  endedAt?: string | null;
  billable?: boolean | null;
  billableMinutes?: number | null;
  notes?: string | null;
  status?: TimeEntryStatus | null;
  idempotencyKey?: string | null;
}
