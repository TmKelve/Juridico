import {
  publicationAuditEventTypes,
  publicationAuditStatuses,
  type LegacyPublicationEventDraft,
  type PublicationAuditEvent,
  type PublicationAuditQuery,
  type PublicationAuditSink,
} from './publication-audit.types';

function isIsoDateTime(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

function assertKnownEvent(event: PublicationAuditEvent) {
  if (!publicationAuditEventTypes.includes(event.eventType)) {
    throw new Error(`Unsupported audit event type: ${event.eventType}`);
  }

  if (!publicationAuditStatuses.includes(event.status)) {
    throw new Error(`Unsupported audit status: ${event.status}`);
  }

  if (!isIsoDateTime(event.occurredAt)) {
    throw new Error(`Invalid occurredAt: ${event.occurredAt}`);
  }
}

function sortByOccurredAtDesc(items: PublicationAuditEvent[]) {
  return [...items].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

export class InMemoryPublicationAuditSink implements PublicationAuditSink {
  private readonly events: PublicationAuditEvent[] = [];

  async append(event: PublicationAuditEvent) {
    this.events.push(event);
    return event;
  }

  async list(query: PublicationAuditQuery = {}) {
    const filtered = this.events.filter((event) => {
      if (query.publicationId !== undefined && event.publicationId !== query.publicationId) return false;
      if (query.captureId !== undefined && event.captureId !== query.captureId) return false;
      if (query.triageItemId !== undefined && event.triageItemId !== query.triageItemId) return false;
      if (query.jobId !== undefined && event.jobId !== query.jobId) return false;
      if (query.processId !== undefined && event.processId !== query.processId) return false;
      if (query.eventType !== undefined && event.eventType !== query.eventType) return false;
      if (query.status !== undefined && event.status !== query.status) return false;
      return true;
    });

    const sorted = sortByOccurredAtDesc(filtered);
    return typeof query.limit === 'number' ? sorted.slice(0, query.limit) : sorted;
  }
}

export class PublicationAuditService {
  constructor(private readonly dependencies: { sink: PublicationAuditSink }) {}

  async record(input: PublicationAuditEvent) {
    const event = this.normalize(input);
    return this.dependencies.sink.append(event);
  }

  async recordMany(inputs: PublicationAuditEvent[]) {
    const recorded: PublicationAuditEvent[] = [];
    for (const input of inputs) {
      recorded.push(await this.record(input));
    }
    return recorded;
  }

  async query(query: PublicationAuditQuery = {}) {
    return this.dependencies.sink.list(query);
  }

  normalize(input: PublicationAuditEvent): PublicationAuditEvent {
    const event: PublicationAuditEvent = {
      ...input,
      publicationId: input.publicationId ?? null,
      captureId: input.captureId ?? null,
      triageItemId: input.triageItemId ?? null,
      jobId: input.jobId ?? null,
      processId: input.processId ?? null,
      details: input.details ?? {},
      occurredAt: new Date(input.occurredAt).toISOString(),
    };

    assertKnownEvent(event);
    return event;
  }

  buildLegacyPublicationEventDraft(input: PublicationAuditEvent): LegacyPublicationEventDraft | null {
    const normalized = this.normalize(input);
    const detailSummary = JSON.stringify(normalized.details);

    if (!normalized.captureId) {
      return null;
    }

    return {
      eventType: normalized.eventType,
      eventAt: new Date(normalized.occurredAt),
      title: `Audit ${normalized.eventType}`,
      summary: `${normalized.status} ${normalized.eventType}`,
      fullText: detailSummary,
      riskLevel: normalized.status === 'error' ? 'critico' : normalized.status === 'warning' ? 'atencao' : 'normal',
      requiresAction: normalized.status !== 'success',
      processId: normalized.processId ?? null,
      publicationId: normalized.publicationId ?? null,
      captureId: normalized.captureId,
    };
  }
}
