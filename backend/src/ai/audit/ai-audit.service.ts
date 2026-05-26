import { randomUUID } from 'crypto';
import type { AiAuditEventInput, AiAuditEventRecord, AiAuditQuery } from './ai-audit.types';

export class InMemoryAiAuditService {
  private readonly events: AiAuditEventRecord[] = [];

  async record(input: AiAuditEventInput): Promise<AiAuditEventRecord> {
    const occurredAt = new Date(input.occurredAt).toISOString();
    const event: AiAuditEventRecord = {
      ...input,
      id: randomUUID(),
      occurredAt,
      createdAt: new Date().toISOString(),
      latencyMs: input.latencyMs ?? null,
      estimatedCostUsd: input.estimatedCostUsd ?? null,
      correlationId: input.correlationId ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      notes: input.notes ?? null,
      details: input.details ?? {},
    };
    this.events.push(event);
    return event;
  }

  async list(query: AiAuditQuery = {}) {
    const filtered = this.events.filter((event) => {
      if (query.executionId && event.executionId !== query.executionId) return false;
      if (query.commandKey && event.commandKey !== query.commandKey) return false;
      if (query.targetType && event.targetType !== query.targetType) return false;
      if (query.targetId && event.targetId !== query.targetId) return false;
      if (query.actionTaken && event.actionTaken !== query.actionTaken) return false;
      if (query.status && event.status !== query.status) return false;
      if (query.correlationId && event.correlationId !== query.correlationId) return false;
      return true;
    });

    const sorted = [...filtered].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
    return typeof query.limit === 'number' ? sorted.slice(0, query.limit) : sorted;
  }
}
