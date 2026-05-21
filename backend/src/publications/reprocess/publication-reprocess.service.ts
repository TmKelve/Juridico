import { PublicationAuditService, type InMemoryPublicationAuditSink } from '../audit/publication-audit.service';
import type { PublicationAuditEvent, PublicationAuditSink } from '../audit/publication-audit.types';
import type {
  PublicationDeadLetterEntry,
  PublicationDeadLetterStore,
  PublicationReprocessRequest,
  PublicationReprocessResult,
} from './publication-reprocess.types';

class PublicationReprocessError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PublicationReprocessError';
  }
}

class InMemoryPublicationDeadLetterStore implements PublicationDeadLetterStore {
  private readonly entries: PublicationDeadLetterEntry[] = [];

  async save(entry: PublicationDeadLetterEntry) {
    const index = this.entries.findIndex((current) => current.id === entry.id);
    if (index >= 0) {
      this.entries[index] = entry;
      return entry;
    }

    this.entries.push(entry);
    return entry;
  }

  async list() {
    return [...this.entries];
  }
}

function readDetailString(details: Record<string, unknown>, key: string, fallback: string) {
  const value = details[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function buildDeadLetterId(failedEvent: PublicationAuditEvent) {
  return [
    failedEvent.captureId ?? 'no-capture',
    failedEvent.jobId ?? 'no-job',
    failedEvent.eventType,
    failedEvent.occurredAt,
  ].join(':');
}

export { InMemoryPublicationDeadLetterStore, PublicationReprocessError };

export class PublicationReprocessService {
  private readonly auditService: PublicationAuditService;
  private readonly deadLetterStore: PublicationDeadLetterStore;
  private readonly maxAttempts: number;

  constructor(input: {
    auditSink: PublicationAuditSink | InMemoryPublicationAuditSink;
    deadLetterStore?: PublicationDeadLetterStore;
    maxAttempts?: number;
  }) {
    this.auditService = new PublicationAuditService({ sink: input.auditSink });
    this.deadLetterStore = input.deadLetterStore ?? new InMemoryPublicationDeadLetterStore();
    this.maxAttempts = input.maxAttempts ?? 3;
  }

  async requestReprocess(input: PublicationReprocessRequest): Promise<PublicationReprocessResult> {
    const failedEvent = this.auditService.normalize(input.failedEvent);
    this.assertReprocessable(failedEvent);

    const requestedAt = new Date().toISOString();
    const currentAttempt = Number(failedEvent.details.attemptCount ?? 0) + 1;

    if (currentAttempt > this.maxAttempts) {
      throw new PublicationReprocessError('PUB_REPROCESS_NOT_ALLOWED', 'Maximum reprocess attempts exceeded.');
    }

    const deadLetter: PublicationDeadLetterEntry = {
      id: buildDeadLetterId(failedEvent),
      fingerprint: readDetailString(failedEvent.details, 'fingerprint', `capture:${failedEvent.captureId ?? 'unknown'}`),
      sourceType: readDetailString(failedEvent.details, 'sourceType', 'evidencia_insuficiente'),
      publicationId: failedEvent.publicationId ?? null,
      captureId: failedEvent.captureId ?? null,
      triageItemId: failedEvent.triageItemId ?? null,
      jobId: failedEvent.jobId ?? null,
      processId: failedEvent.processId ?? null,
      failedEventType: failedEvent.eventType,
      failedAt: failedEvent.occurredAt,
      errorCode: readDetailString(failedEvent.details, 'code', 'PUB_PIPELINE_FAILURE'),
      errorMessage: readDetailString(failedEvent.details, 'message', 'Falha registrada para reprocessamento.'),
      stage: readDetailString(failedEvent.details, 'stage', 'evidencia_insuficiente'),
      status: 'pending_reprocess',
      attemptCount: currentAttempt,
      lastRequestedBy: input.actor,
      lastRequestedAt: requestedAt,
      metadata: {
        reason: input.reason,
        originalDetails: failedEvent.details,
      },
    };

    await this.deadLetterStore.save(deadLetter);

    const auditEvents = await this.auditService.recordMany([
      {
        eventType: 'reprocess_requested',
        status: 'warning',
        publicationId: failedEvent.publicationId ?? null,
        captureId: failedEvent.captureId ?? null,
        triageItemId: failedEvent.triageItemId ?? null,
        jobId: failedEvent.jobId ?? null,
        processId: failedEvent.processId ?? null,
        details: {
          deadLetterId: deadLetter.id,
          errorCode: deadLetter.errorCode,
          reason: input.reason,
          attemptCount: deadLetter.attemptCount,
        },
        occurredAt: requestedAt,
        actor: input.actor,
      },
      {
        eventType: 'reprocess_completed',
        status: 'success',
        publicationId: failedEvent.publicationId ?? null,
        captureId: failedEvent.captureId ?? null,
        triageItemId: failedEvent.triageItemId ?? null,
        jobId: failedEvent.jobId ?? null,
        processId: failedEvent.processId ?? null,
        details: {
          deadLetterId: deadLetter.id,
          replayMode: 'manual_dispatch_pending',
          status: deadLetter.status,
        },
        occurredAt: requestedAt,
        actor: input.actor,
      },
    ]);

    return {
      deadLetter,
      auditEvents,
    };
  }

  async listDeadLetters() {
    return this.deadLetterStore.list();
  }

  private assertReprocessable(event: PublicationAuditEvent) {
    if (event.eventType !== 'pipeline_failed' || event.status !== 'error') {
      throw new PublicationReprocessError('PUB_REPROCESS_NOT_ALLOWED', 'Only pipeline_failed events with error status are eligible.');
    }
  }
}
