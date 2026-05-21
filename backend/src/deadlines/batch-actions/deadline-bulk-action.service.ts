import { DeadlineAuditService } from '../deadline-audit.service';
import type { DeadlineAgendaEventCommand, DeadlineRecord, StoredIdempotencyRecord } from '../deadline-core.types';
import { requireNonEmptyString, requireIsoDateTime } from '../deadline-validators';
import type {
  DeadlineBulkActionRequest,
  DeadlineBulkActionResult,
  DeadlineBulkActionStore,
  DeadlineBulkActionItemResult,
} from './deadline-bulk-action.types';
import { validateDeadlineBulkAction } from './deadline-bulk-action.validators';
import { DeadlineRiskService } from '../deadline-risk.service';

function cloneResult(record: StoredIdempotencyRecord<DeadlineBulkActionResult>): DeadlineBulkActionResult {
  return {
    ...record.result,
    idempotency: {
      key: record.key,
      status: 'replayed',
      replayed: true,
    },
  };
}

export class InMemoryDeadlineBulkActionStore implements DeadlineBulkActionStore {
  private readonly deadlines = new Map<number, DeadlineRecord>();
  private readonly idempotency = new Map<string, StoredIdempotencyRecord<DeadlineBulkActionResult>>();

  constructor(items: DeadlineRecord[] = []) {
    for (const item of items) {
      this.deadlines.set(item.id, { ...item, agendaSyncStatus: item.agendaSyncStatus ?? (item.agendaEventId ? 'synced' : 'missing') });
    }
  }

  async listByIds(ids: number[]) {
    return ids.map((id) => this.deadlines.get(id)).filter((item): item is DeadlineRecord => Boolean(item)).map((item) => ({ ...item }));
  }

  async save(deadline: DeadlineRecord) {
    this.deadlines.set(deadline.id, { ...deadline });
    return { ...deadline };
  }

  async getIdempotency(key: string) {
    return this.idempotency.get(key) ?? null;
  }

  async saveIdempotency(record: StoredIdempotencyRecord<DeadlineBulkActionResult>) {
    this.idempotency.set(record.key, record);
  }
}

export class DeadlineBulkActionService {
  private readonly auditService = new DeadlineAuditService();
  private readonly riskService = new DeadlineRiskService();

  constructor(
    private readonly dependencies: {
      store: DeadlineBulkActionStore;
      now?: () => Date;
    },
  ) {}

  async execute(input: DeadlineBulkActionRequest): Promise<DeadlineBulkActionResult> {
    const idempotencyKey = requireNonEmptyString('idempotencyKey', input.idempotencyKey);
    const actor = requireNonEmptyString('actor', input.actor);
    const action = validateDeadlineBulkAction(input.action);
    const existing = await this.dependencies.store.getIdempotency(idempotencyKey);

    if (existing) {
      return cloneResult(existing);
    }

    const now = this.dependencies.now?.() ?? new Date();
    const deadlines = await this.dependencies.store.listByIds(action.deadlineIds);
    const byId = new Map(deadlines.map((item) => [item.id, item]));

    const items: DeadlineBulkActionItemResult[] = [];
    const auditEvents = [];
    const agendaEvents: DeadlineAgendaEventCommand[] = [];

    for (const deadlineId of action.deadlineIds) {
      const deadline = byId.get(deadlineId);
      if (!deadline) {
        items.push({ deadlineId, status: 'failed', reason: 'Prazo não encontrado', deadline: null });
        continue;
      }

      const result = await this.applyAction({
        actor,
        action,
        deadline,
        now,
      });

      items.push(result.item);
      if (result.auditEvent) auditEvents.push(result.auditEvent);
      if (result.agendaEvent) agendaEvents.push(result.agendaEvent);
    }

    const summary = {
      requested: action.deadlineIds.length,
      updated: items.filter((item) => item.status === 'updated').length,
      skipped: items.filter((item) => item.status === 'skipped').length,
      failed: items.filter((item) => item.status === 'failed').length,
    };

    const result: DeadlineBulkActionResult = {
      summary,
      items,
      auditEvents,
      agendaEvents,
      idempotency: {
        key: idempotencyKey,
        status: 'completed',
        replayed: false,
      },
    };

    await this.dependencies.store.saveIdempotency({
      key: idempotencyKey,
      status: 'completed',
      result,
    });

    return result;
  }

  private async applyAction(input: {
    actor: string;
    action: ReturnType<typeof validateDeadlineBulkAction>;
    deadline: DeadlineRecord;
    now: Date;
  }) {
    const { actor, action, deadline, now } = input;

    if (action.type === 'complete') {
      if (deadline.status === 'concluido' || deadline.completedAt) {
        return {
          item: {
            deadlineId: deadline.id,
            status: 'skipped' as const,
            reason: 'Prazo já concluído',
            deadline: { ...deadline },
          },
        };
      }

      const updated: DeadlineRecord = {
        ...deadline,
        status: 'concluido',
        completedAt: now.toISOString(),
      };
      await this.dependencies.store.save(updated);

      const risk = this.riskService.evaluate({
        id: updated.id,
        processId: updated.processId,
        title: updated.title,
        dueDate: updated.dueDate,
        status: updated.status,
        priority: updated.priority,
        origin: updated.origin,
        publicationId: updated.publicationId,
        processPhase: updated.processPhase,
        agendaEventId: updated.agendaEventId,
        agendaSyncStatus: updated.agendaSyncStatus ?? (updated.agendaEventId ? 'synced' : 'missing'),
        completedAt: updated.completedAt,
      }, { now });

      return {
        item: {
          deadlineId: updated.id,
          status: 'updated' as const,
          deadline: updated,
        },
        auditEvent: this.auditService.recordCompletion({
          actor: actor as `user:${number}` | 'scheduler' | 'system',
          deadlineId: updated.id,
          processId: updated.processId,
          publicationId: updated.publicationId,
          source: 'bulk_action',
          reason: action.reason ?? null,
          occurredAt: now.toISOString(),
          risk,
        }),
        agendaEvent: updated.agendaEventId
          ? {
              action: 'complete' as const,
              externalKey: `deadline:${updated.id}`,
              agendaEventId: updated.agendaEventId,
            }
          : null,
      };
    }

    if (action.type === 'reopen') {
      if (deadline.status !== 'concluido' && !deadline.completedAt) {
        return {
          item: {
            deadlineId: deadline.id,
            status: 'skipped' as const,
            reason: 'Prazo já está aberto',
            deadline: { ...deadline },
          },
        };
      }

      const updated: DeadlineRecord = {
        ...deadline,
        status: 'aberto',
        completedAt: null,
      };
      await this.dependencies.store.save(updated);
      return {
        item: {
          deadlineId: updated.id,
          status: 'updated' as const,
          deadline: updated,
        },
        agendaEvent: {
          action: 'upsert' as const,
          externalKey: `deadline:${updated.id}`,
          agendaEventId: updated.agendaEventId,
          payload: buildAgendaPayload(updated),
        },
      };
    }

    if (action.type === 'reprioritize') {
      const updated: DeadlineRecord = {
        ...deadline,
        priority: action.priority,
      };
      await this.dependencies.store.save(updated);
      return {
        item: {
          deadlineId: updated.id,
          status: 'updated' as const,
          deadline: updated,
        },
        agendaEvent: {
          action: 'upsert' as const,
          externalKey: `deadline:${updated.id}`,
          agendaEventId: updated.agendaEventId,
          payload: buildAgendaPayload(updated),
        },
      };
    }

    if (action.type === 'reassign') {
      const updated: DeadlineRecord = {
        ...deadline,
        responsible: action.responsible,
      };
      await this.dependencies.store.save(updated);
      return {
        item: {
          deadlineId: updated.id,
          status: 'updated' as const,
          deadline: updated,
        },
        agendaEvent: {
          action: 'upsert' as const,
          externalKey: `deadline:${updated.id}`,
          agendaEventId: updated.agendaEventId,
          payload: buildAgendaPayload(updated),
        },
      };
    }

    const updated: DeadlineRecord = {
      ...deadline,
      dueDate: action.dueDate,
      completedAt: deadline.status === 'concluido' ? null : deadline.completedAt,
      status: deadline.status === 'concluido' ? 'aberto' : deadline.status,
    };
    await this.dependencies.store.save(updated);
    return {
      item: {
        deadlineId: updated.id,
        status: 'updated' as const,
        deadline: updated,
      },
      agendaEvent: {
        action: 'upsert' as const,
        externalKey: `deadline:${updated.id}`,
        agendaEventId: updated.agendaEventId,
        payload: buildAgendaPayload(updated),
      },
    };
  }
}

function buildAgendaPayload(deadline: DeadlineRecord) {
  const startAt = requireIsoDateTime('agenda.startAt', `${deadline.dueDate}T09:00:00.000Z`);
  const endAt = requireIsoDateTime('agenda.endAt', `${deadline.dueDate}T10:00:00.000Z`);

  return {
    title: deadline.title,
    description: deadline.description,
    eventType: 'prazo_calendario' as const,
    status: deadline.status === 'concluido' ? 'concluido' : 'agendado',
    priority: deadline.priority,
    startAt,
    endAt,
    processId: deadline.processId,
    clientId: deadline.clientId,
    responsible: deadline.responsible,
    origin: deadline.origin,
    notes: null,
  };
}
