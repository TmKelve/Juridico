import { DeadlineDomainError } from './deadline-errors';
import { requireIsoDateTime } from './deadline-validators';
import {
  deadlineAuditEventTypes,
  deadlineAuditStatuses,
  type DeadlineAuditEvent,
  type DeadlineCompletionAuditInput,
} from './deadline-audit.types';

function assertKnownEvent(event: DeadlineAuditEvent) {
  if (!deadlineAuditEventTypes.includes(event.eventType)) {
    throw new DeadlineDomainError('DEADLINE_AUDIT_INVALID_EVENT', `Unsupported deadline audit event: ${event.eventType}.`);
  }

  if (!deadlineAuditStatuses.includes(event.status)) {
    throw new DeadlineDomainError('DEADLINE_AUDIT_INVALID_STATUS', `Unsupported deadline audit status: ${event.status}.`);
  }
}

export class DeadlineAuditService {
  normalize(event: DeadlineAuditEvent): DeadlineAuditEvent {
    const normalized: DeadlineAuditEvent = {
      ...event,
      processId: event.processId ?? null,
      publicationId: event.publicationId ?? null,
      occurredAt: requireIsoDateTime('occurredAt', event.occurredAt),
      details: event.details ?? {},
    };

    assertKnownEvent(normalized);
    return normalized;
  }

  recordCompletion(input: DeadlineCompletionAuditInput) {
    return this.normalize({
      eventType: 'deadline_completed',
      status: 'success',
      deadlineId: input.deadlineId,
      processId: input.processId,
      publicationId: input.publicationId,
      actor: input.actor,
      occurredAt: input.occurredAt,
      details: {
        source: input.source,
        reason: input.reason,
        riskLevelAfterCompletion: input.risk.level,
        riskScoreAfterCompletion: input.risk.score,
      },
    });
  }

  recordCreatedFromPublication(input: {
    actor: DeadlineAuditEvent['actor'];
    deadlineId: number;
    processId: number;
    publicationId: number;
    occurredAt: string;
    risk: { level: string; score: number };
    agendaEventId: string | null;
    idempotencyKey: string;
  }) {
    return this.normalize({
      eventType: 'deadline_created_from_publication',
      status: 'success',
      deadlineId: input.deadlineId,
      processId: input.processId,
      publicationId: input.publicationId,
      actor: input.actor,
      occurredAt: input.occurredAt,
      details: {
        agendaEventId: input.agendaEventId,
        riskLevel: input.risk.level,
        riskScore: input.risk.score,
        idempotencyKey: input.idempotencyKey,
      },
    });
  }
}
