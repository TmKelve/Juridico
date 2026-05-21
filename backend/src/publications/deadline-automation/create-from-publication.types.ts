import type {
  DeadlineActor,
  DeadlineAgendaEventCommand,
  DeadlineRecord,
  StoredIdempotencyRecord,
} from '../../deadlines/deadline-core.types';
import type { DeadlineAuditEvent } from '../../deadlines/deadline-audit.types';
import type { DeadlineRiskEvaluation } from '../../deadlines/deadline-risk.types';

export interface PublicationDeadlineAutomationPublication {
  id: number;
  processId: number;
  processTitle: string;
  processPhase: string | null;
  clientId: number | null;
  clientName: string | null;
  publishedAt: string;
  tribunal: string;
  summary: string;
  impact: string | null;
}

export interface PublicationDeadlineAutomationRequestPayload {
  dueDate?: string;
  title?: string;
  notes?: string;
  responsible?: string;
  priority?: string;
  createAgendaEvent?: boolean;
}

export interface CreateDeadlineFromPublicationRequest {
  idempotencyKey: string;
  actor: DeadlineActor;
  publication: PublicationDeadlineAutomationPublication;
  request: PublicationDeadlineAutomationRequestPayload;
}

export interface CreateDeadlineFromPublicationResult {
  outcome: 'created' | 'duplicate';
  deadline: DeadlineRecord;
  agendaEvent: DeadlineAgendaEventCommand | null;
  risk: DeadlineRiskEvaluation;
  auditEvent: DeadlineAuditEvent;
  idempotency: {
    key: string;
    status: 'completed' | 'replayed';
    replayed: boolean;
    retryCount: number;
  };
}

export interface DeadlineAutomationStore {
  createDeadline(input: Omit<DeadlineRecord, 'id'>): Promise<DeadlineRecord>;
  getIdempotency(key: string): Promise<StoredIdempotencyRecord<CreateDeadlineFromPublicationResult> | null>;
  saveIdempotency(record: StoredIdempotencyRecord<CreateDeadlineFromPublicationResult>): Promise<void>;
}

export interface DeadlineAutomationAgendaGatewayResult {
  agendaEventId: string;
}

export interface DeadlineAutomationAgendaGateway {
  upsert(command: DeadlineAgendaEventCommand): Promise<DeadlineAutomationAgendaGatewayResult>;
}
