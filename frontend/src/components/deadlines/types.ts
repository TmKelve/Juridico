import type { ApiAgendaEvent, ApiDeadline } from '../../api';

export type DeadlineStatus = ApiDeadline['status'];
export type DeadlinePriority = ApiDeadline['priority'];
export type DeadlineOrigin = ApiDeadline['origin'];
export type DeadlineViewMode = 'lista' | 'calendario';
export type DeadlineCalendarMode = 'dia' | 'semana' | 'mes';
export type DeadlinePeriodFilter = 'todos' | 'hoje' | 'semana' | 'mes' | 'atrasados';
export type DeadlineSortField = 'risco' | 'vencimento' | 'prioridade' | 'status';
export type DeadlineRiskTone = 'danger' | 'warning' | 'info' | 'success';
export type BulkActionMode = 'single' | 'bulk';
export type BulkActionKind = 'complete' | 'schedule';

export interface DeadlineFilters {
  query: string;
  period: DeadlinePeriodFilter;
  status: string;
  priority: string;
  responsible: string;
  area: string;
  process: string;
  origin: string;
  dueTodayOnly: boolean;
  dueInDays: string;
}

export interface DeadlineCompletionAuditEntry {
  deadlineId: number;
  completedAt: string;
  completedBy: string;
  completionMode: BulkActionMode | 'api';
  reason: string;
  notes: string;
  persisted: boolean;
  source: 'ui' | 'api';
}

export interface DeadlineAgendaDraft {
  deadlineId: number;
  deadlineTitle: string;
  title: string;
  type: ApiAgendaEvent['type'];
  status: ApiAgendaEvent['status'];
  priority: ApiAgendaEvent['priority'];
  date: string;
  startTime: string;
  endTime: string;
  processId: number;
  clientId: number | null;
  client: string;
  responsible: string;
  locationOrChannel: string;
  notes: string;
  origin: ApiAgendaEvent['origin'];
}

export interface DeadlineAgendaSyncState {
  status: 'idle' | 'pending' | 'synced' | 'error';
  message: string;
  syncedAt?: string;
  eventId?: number;
  persisted: boolean;
  expectedContract: string[];
}

export interface DeadlineAutomationContext {
  kind: 'publicacao' | 'audiencia' | 'cliente' | 'interno';
  label: string;
  summary: string;
  actionLabel: string;
  linkedPath: string;
}

export interface DeadlineViewItem extends ApiDeadline {
  daysToDue: number;
  riskScore: number;
  riskTone: DeadlineRiskTone;
  riskLabel: string;
  relativeDueLabel: string;
  ownerLabel: string;
  massActionEligible: boolean;
  completionAudit: DeadlineCompletionAuditEntry | null;
  automationContext: DeadlineAutomationContext;
  agendaDraft: DeadlineAgendaDraft;
  agendaSyncState: DeadlineAgendaSyncState;
}
