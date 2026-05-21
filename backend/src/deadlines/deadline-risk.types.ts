import type { DeadlineAgendaSyncStatus } from './deadline-core.types';

export type DeadlineRiskLevel = 'baixo' | 'normal' | 'atencao' | 'critico';

export interface DeadlineRiskReason {
  code:
    | 'COMPLETED'
    | 'OVERDUE'
    | 'DUE_IN_24H'
    | 'DUE_IN_72H'
    | 'PUBLICATION_ORIGIN'
    | 'HIGH_PRIORITY'
    | 'CRITICAL_PRIORITY'
    | 'RECURSAL_PHASE'
    | 'NO_AGENDA_EVENT'
    | 'AGENDA_SYNC_FAILED'
    | 'AGENDA_SYNC_RETRYING';
  weight: number;
  message: string;
}

export interface DeadlineRiskInput {
  id: number;
  processId: number;
  title: string;
  dueDate: string;
  status: string;
  priority: string;
  origin: string;
  publicationId: number | null;
  processPhase: string | null;
  agendaEventId: string | null;
  agendaSyncStatus: DeadlineAgendaSyncStatus;
  completedAt: string | null;
}

export interface DeadlineRiskEvaluation {
  level: DeadlineRiskLevel;
  score: number;
  reasons: DeadlineRiskReason[];
  computedAt: string;
}
