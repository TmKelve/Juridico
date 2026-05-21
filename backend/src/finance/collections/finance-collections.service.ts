import { FinanceAuditService, FinanceDomainError, type FinanceActor } from '../shared';

export class InMemoryFinanceCollectionsRepository {
  private readonly entries = new Map<number, any>();
  private readonly schedules = new Map<number, any>();
  private readonly attempts = new Map<number, any[]>();
  private sequence = 1;

  constructor(seed: { entries?: any[] } = {}) {
    for (const entry of seed.entries ?? []) this.entries.set(entry.id, { ...entry });
  }

  async findEntryById(entryId: number) {
    return this.entries.get(entryId) ?? null;
  }

  async createSchedule(data: any) {
    const row = { id: this.sequence++, ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.schedules.set(row.id, row);
    this.attempts.set(row.id, []);
    return row;
  }

  async listSchedules() {
    return [...this.schedules.values()];
  }

  async getScheduleById(scheduleId: number) {
    return this.schedules.get(scheduleId) ?? null;
  }

  async listDueSchedules(nowIso: string) {
    return [...this.schedules.values()].filter((schedule) => schedule.active && schedule.nextRunAt <= nowIso);
  }

  async createAttempt(scheduleId: number, data: any) {
    const current = this.attempts.get(scheduleId) ?? [];
    const row = { id: current.length + 1, scheduleId, ...data, createdAt: new Date().toISOString() };
    current.push(row);
    this.attempts.set(scheduleId, current);
    return row;
  }

  async listAttemptsByScheduleId(scheduleId: number) {
    return [...(this.attempts.get(scheduleId) ?? [])];
  }

  async updateSchedule(scheduleId: number, data: any) {
    const current = this.schedules.get(scheduleId);
    const next = { ...current, ...data, updatedAt: new Date().toISOString() };
    this.schedules.set(scheduleId, next);
    return next;
  }

  upsertEntry(entry: any) {
    this.entries.set(entry.id, { ...this.entries.get(entry.id), ...entry });
  }
}

export class PrismaFinanceCollectionsRepository {
  constructor(private readonly prisma: any) {}

  async findEntryById(entryId: number) {
    return this.prisma.financeEntry.findUnique({ where: { id: entryId } });
  }

  async createSchedule(data: any) {
    return this.prisma.financeCollectionSchedule.create({ data });
  }

  async listSchedules() {
    return this.prisma.financeCollectionSchedule.findMany({ orderBy: { nextRunAt: 'asc' } });
  }

  async getScheduleById(scheduleId: number) {
    return this.prisma.financeCollectionSchedule.findUnique({ where: { id: scheduleId } });
  }

  async listDueSchedules(nowIso: string) {
    return this.prisma.financeCollectionSchedule.findMany({
      where: {
        active: true,
        nextRunAt: { lte: new Date(nowIso) },
      },
      include: {
        entry: {
          include: {
            clientRecord: true,
          },
        },
      },
      orderBy: { nextRunAt: 'asc' },
    });
  }

  async createAttempt(scheduleId: number, data: any) {
    return this.prisma.financeCollectionAttempt.create({ data: { scheduleId, ...data } });
  }

  async listAttemptsByScheduleId(scheduleId: number) {
    return this.prisma.financeCollectionAttempt.findMany({
      where: { scheduleId },
      orderBy: { attemptNumber: 'asc' },
    });
  }

  async updateSchedule(scheduleId: number, data: any) {
    return this.prisma.financeCollectionSchedule.update({ where: { id: scheduleId }, data });
  }
}

export interface FinanceCollectionsRepository {
  findEntryById(entryId: number): Promise<any | null>;
  createSchedule(data: any): Promise<any>;
  listSchedules(): Promise<any[]>;
  getScheduleById(scheduleId: number): Promise<any | null>;
  listDueSchedules(nowIso: string): Promise<any[]>;
  createAttempt(scheduleId: number, data: any): Promise<any>;
  listAttemptsByScheduleId(scheduleId: number): Promise<any[]>;
  updateSchedule(scheduleId: number, data: any): Promise<any>;
}

export class FinanceCollectionsService {
  constructor(private readonly dependencies: { repository: FinanceCollectionsRepository; auditService: FinanceAuditService }) {}

  async schedule(input: {
    entryId: number;
    channel: 'email' | 'whatsapp' | 'sms';
    cadenceDays: number;
    maxAttempts: number;
    startsAt: string;
    actor: FinanceActor;
    idempotencyKey?: string | null;
  }) {
    const entry = await this.dependencies.repository.findEntryById(input.entryId);
    if (!entry || entry.type !== 'receivable' || ['paid', 'cancelled'].includes(entry.status)) {
      throw new FinanceDomainError('Lançamento não elegível para régua de cobrança', 409, 'FIN_COLLECTION_INVALID', { entryId: input.entryId });
    }

    const result = await this.dependencies.auditService.runIdempotent({
      key: input.idempotencyKey,
      scope: 'finance.collections.schedule',
      entityType: 'collection',
      entityId: input.entryId,
      action: 'schedule',
      payload: input,
      responseCode: 201,
      execute: async () => this.dependencies.repository.createSchedule({
        entryId: input.entryId,
        channel: input.channel,
        cadenceDays: input.cadenceDays,
        maxAttempts: input.maxAttempts,
        startsAt: input.startsAt,
        nextRunAt: input.startsAt,
        status: 'scheduled',
        active: true,
      }),
    });

    const auditEvent = await this.dependencies.auditService.record({
      scope: 'finance.collections.schedule',
      entityType: 'collection',
      entityId: result.data.id,
      action: 'schedule_created',
      status: 'success',
      summary: `Régua de cobrança criada para o lançamento #${input.entryId}`,
      details: { channel: input.channel, cadenceDays: input.cadenceDays },
      actor: input.actor,
      idempotencyKey: input.idempotencyKey,
    });

    return {
      schedule: result.data,
      auditEvent,
      idempotency: { mode: result.mode },
    };
  }
}
