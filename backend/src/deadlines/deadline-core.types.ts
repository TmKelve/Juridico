export type DeadlineActor = `user:${number}` | 'scheduler' | 'system';

export type DeadlineAgendaSyncStatus = 'synced' | 'missing' | 'retrying' | 'failed' | 'not_requested';

export interface DeadlineRecord {
  id: number;
  processId: number;
  processTitle: string | null;
  processPhase: string | null;
  clientId: number | null;
  clientName: string | null;
  title: string;
  description: string | null;
  dueDate: string;
  status: string;
  priority: string;
  origin: string;
  responsible: string | null;
  createdBy: string | null;
  completedAt: string | null;
  publicationId: number | null;
  agendaEventId: string | null;
  agendaSyncStatus?: DeadlineAgendaSyncStatus;
}

export interface DeadlineAgendaEventCommand {
  action: 'upsert' | 'complete' | 'cancel';
  externalKey: string;
  agendaEventId?: string | null;
  payload?: {
    title: string;
    description?: string | null;
    eventType: 'prazo_calendario';
    status: string;
    priority: string;
    startAt: string;
    endAt: string;
    processId: number;
    clientId: number | null;
    responsible: string | null;
    origin: string;
    notes: string | null;
  };
}

export interface StoredIdempotencyRecord<TResult> {
  key: string;
  status: 'completed';
  result: TResult;
}
