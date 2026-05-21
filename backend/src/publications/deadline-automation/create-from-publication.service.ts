import { DeadlineAuditService } from '../../deadlines/deadline-audit.service';
import { DeadlineDomainError } from '../../deadlines/deadline-errors';
import type {
  DeadlineAgendaEventCommand,
  DeadlineRecord,
  StoredIdempotencyRecord,
} from '../../deadlines/deadline-core.types';
import { DeadlineRiskService } from '../../deadlines/deadline-risk.service';
import {
  requireIsoDateTime,
  requireNonEmptyString,
} from '../../deadlines/deadline-validators';
import type {
  CreateDeadlineFromPublicationRequest,
  CreateDeadlineFromPublicationResult,
  DeadlineAutomationAgendaGateway,
  DeadlineAutomationStore,
} from './create-from-publication.types';
import { validateCreateFromPublicationRequest } from './create-from-publication.validators';

function addDays(base: string, amount: number) {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + amount);
  return next.toISOString().slice(0, 10);
}

function buildAgendaPayload(deadline: DeadlineRecord): DeadlineAgendaEventCommand {
  return {
    action: 'upsert',
    externalKey: `deadline:${deadline.id}`,
    payload: {
      title: deadline.title,
      description: deadline.description,
      eventType: 'prazo_calendario',
      status: deadline.status === 'concluido' ? 'concluido' : 'agendado',
      priority: deadline.priority,
      startAt: requireIsoDateTime('agenda.startAt', `${deadline.dueDate}T09:00:00.000Z`),
      endAt: requireIsoDateTime('agenda.endAt', `${deadline.dueDate}T10:00:00.000Z`),
      processId: deadline.processId,
      clientId: deadline.clientId,
      responsible: deadline.responsible,
      origin: deadline.origin,
      notes: deadline.description,
    },
  };
}

function cloneReplay(record: StoredIdempotencyRecord<CreateDeadlineFromPublicationResult>): CreateDeadlineFromPublicationResult {
  return {
    ...record.result,
    outcome: 'duplicate',
    idempotency: {
      ...record.result.idempotency,
      status: 'replayed',
      replayed: true,
    },
  };
}

export class InMemoryDeadlineAutomationStore implements DeadlineAutomationStore {
  private readonly deadlines: DeadlineRecord[] = [];
  private readonly idempotency = new Map<string, StoredIdempotencyRecord<CreateDeadlineFromPublicationResult>>();
  private nextId = 1;

  async createDeadline(input: Omit<DeadlineRecord, 'id'>) {
    const created: DeadlineRecord = {
      id: this.nextId++,
      ...input,
    };
    this.deadlines.push(created);
    return { ...created };
  }

  async getIdempotency(key: string) {
    return this.idempotency.get(key) ?? null;
  }

  async saveIdempotency(record: StoredIdempotencyRecord<CreateDeadlineFromPublicationResult>) {
    this.idempotency.set(record.key, record);
  }
}

export class InMemoryDeadlineAutomationAgendaGateway implements DeadlineAutomationAgendaGateway {
  readonly commands: DeadlineAgendaEventCommand[] = [];
  private nextId = 1;
  private failTimes: number;

  constructor(input: { failTimes?: number } = {}) {
    this.failTimes = input.failTimes ?? 0;
  }

  async upsert(command: DeadlineAgendaEventCommand) {
    this.commands.push(command);
    if (this.failTimes > 0) {
      this.failTimes -= 1;
      throw new DeadlineDomainError('AGENDA_SYNC_RETRY', 'Falha transitória ao sincronizar agenda.', 503, true);
    }

    return {
      agendaEventId: `agenda-${this.nextId++}`,
    };
  }
}

export class CreateDeadlineFromPublicationService {
  private readonly auditService = new DeadlineAuditService();
  private readonly riskService = new DeadlineRiskService();

  constructor(
    private readonly dependencies: {
      store: DeadlineAutomationStore;
      agendaGateway: DeadlineAutomationAgendaGateway;
      now?: () => Date;
      maxAgendaRetries?: number;
    },
  ) {}

  async execute(input: CreateDeadlineFromPublicationRequest): Promise<CreateDeadlineFromPublicationResult> {
    const validated = validateCreateFromPublicationRequest(input);
    const existing = await this.dependencies.store.getIdempotency(validated.idempotencyKey);

    if (existing) {
      return cloneReplay(existing);
    }

    const now = this.dependencies.now?.() ?? new Date();
    const dueDate = validated.request.dueDate ?? addDays(validated.publication.publishedAt, 15);
    const priority = validated.request.priority ?? (validated.publication.impact === 'critico' ? 'alta' : 'media');
    const deadline = await this.dependencies.store.createDeadline({
      processId: validated.publication.processId,
      processTitle: validated.publication.processTitle,
      processPhase: validated.publication.processPhase,
      clientId: validated.publication.clientId,
      clientName: validated.publication.clientName,
      title: validated.request.title ?? `Prazo de manifestação - ${validated.publication.processTitle}`,
      description: validated.request.notes
        ?? `Prazo criado a partir da publicação ${validated.publication.tribunal}. ${validated.publication.summary}`,
      dueDate,
      status: 'aberto',
      priority,
      origin: 'publicacao',
      responsible: validated.request.responsible ?? validated.actor,
      createdBy: validated.actor,
      completedAt: null,
      publicationId: validated.publication.id,
      agendaEventId: null,
      agendaSyncStatus: validated.request.createAgendaEvent ? 'retrying' : 'not_requested',
    });

    let retryCount = 0;
    let agendaEvent: DeadlineAgendaEventCommand | null = null;
    let agendaEventId: string | null = null;

    if (validated.request.createAgendaEvent) {
      const command = buildAgendaPayload(deadline);
      const maxRetries = this.dependencies.maxAgendaRetries ?? 2;

      while (true) {
        try {
          const synced = await this.dependencies.agendaGateway.upsert(command);
          agendaEventId = synced.agendaEventId;
          agendaEvent = {
            ...command,
            agendaEventId,
          };
          break;
        } catch (error) {
          retryCount += 1;
          const isRetryable = error instanceof DeadlineDomainError ? error.retryable : false;
          if (!isRetryable || retryCount > maxRetries) {
            throw new DeadlineDomainError(
              'AGENDA_SYNC_FAILED',
              'Falha ao sincronizar prazo com agenda.',
              503,
              true,
              { retryCount, idempotencyKey: validated.idempotencyKey },
            );
          }
        }
      }
    }

    const risk = this.riskService.evaluate({
      id: deadline.id,
      processId: deadline.processId,
      title: deadline.title,
      dueDate: deadline.dueDate,
      status: deadline.status,
      priority: deadline.priority,
      origin: deadline.origin,
      publicationId: deadline.publicationId,
      processPhase: deadline.processPhase,
      agendaEventId,
      agendaSyncStatus: agendaEventId ? 'synced' : 'not_requested',
      completedAt: deadline.completedAt,
    }, { now });

    const auditEvent = this.auditService.recordCreatedFromPublication({
      actor: validated.actor as `user:${number}` | 'scheduler' | 'system',
      deadlineId: deadline.id,
      processId: deadline.processId,
      publicationId: validated.publication.id,
      occurredAt: now.toISOString(),
      risk,
      agendaEventId,
      idempotencyKey: validated.idempotencyKey,
    });

    const result: CreateDeadlineFromPublicationResult = {
      outcome: 'created',
      deadline: {
        ...deadline,
        agendaEventId,
        agendaSyncStatus: agendaEventId ? 'synced' : 'not_requested',
      },
      agendaEvent,
      risk,
      auditEvent,
      idempotency: {
        key: validated.idempotencyKey,
        status: 'completed',
        replayed: false,
        retryCount,
      },
    };

    await this.dependencies.store.saveIdempotency({
      key: validated.idempotencyKey,
      status: 'completed',
      result,
    });

    return result;
  }
}
