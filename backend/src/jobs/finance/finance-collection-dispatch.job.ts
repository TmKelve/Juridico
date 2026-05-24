import { FinanceAuditService, type FinanceActor } from '../../finance/shared';

export class FinanceCollectionDispatchJob {
  constructor(
    private readonly dependencies: {
      repository: {
        listDueSchedules(nowIso: string): Promise<any[]>;
        listAttemptsByScheduleId(scheduleId: number): Promise<any[]>;
        createAttempt(scheduleId: number, data: Record<string, unknown>): Promise<any>;
        updateSchedule(scheduleId: number, data: Record<string, unknown>): Promise<any>;
      };
      auditService: FinanceAuditService;
      resolveDestination: (schedule: any) => string | Promise<string>;
      transport: {
        send(command: { scheduleId: number; attemptNumber: number; channel: string; destination: string; message: string }): Promise<{
          providerMessageId: string;
          acceptedAt: string;
          providerPayload?: Record<string, unknown>;
        }>;
      };
      retryDelayMs?: number;
    },
  ) {}

  async runDueSchedules(input: { now: string; actor: FinanceActor }) {
    const schedules = await this.dependencies.repository.listDueSchedules(input.now);
    let sent = 0;
    let failed = 0;

    for (const schedule of schedules) {
      const attempts = await this.dependencies.repository.listAttemptsByScheduleId(schedule.id);
      const existingSameSlot = attempts.find((attempt) => readScheduledFor(attempt) === schedule.nextRunAt);
      if (existingSameSlot) continue;

      const attemptNumber = attempts.length + 1;
      const destination = await this.dependencies.resolveDestination(schedule);

      try {
        const delivery = await this.dependencies.transport.send({
          scheduleId: schedule.id,
          attemptNumber,
          channel: schedule.channel,
          destination,
          message: `Lembrete de cobrança do lançamento #${schedule.entryId}`,
        });
        await this.dependencies.repository.createAttempt(schedule.id, {
          attemptNumber,
          status: 'sent',
          channel: schedule.channel,
          destination,
          message: `Lembrete de cobrança do lançamento #${schedule.entryId}`,
          providerPayload: {
            ...(delivery.providerPayload ?? {}),
            scheduledFor: schedule.nextRunAt,
          },
          sentAt: delivery.acceptedAt,
        });
        const nextRun = new Date(new Date(schedule.nextRunAt).getTime() + schedule.cadenceDays * 86400000).toISOString();
        await this.dependencies.repository.updateSchedule(schedule.id, {
          status: 'scheduled',
          lastAttemptAt: delivery.acceptedAt,
          nextRunAt: nextRun,
        });
        sent += 1;
      } catch (error: any) {
        await this.dependencies.repository.createAttempt(schedule.id, {
          attemptNumber,
          status: 'failed',
          channel: schedule.channel,
          destination,
          message: `Lembrete de cobrança do lançamento #${schedule.entryId}`,
          providerPayload: {
            scheduledFor: schedule.nextRunAt,
          },
          errorMessage: error?.message ?? 'unknown error',
        });
        const retryDelayMs = this.dependencies.retryDelayMs ?? 5 * 60 * 1000;
        await this.dependencies.repository.updateSchedule(schedule.id, {
          status: 'failed',
          nextRunAt: new Date(new Date(input.now).getTime() + retryDelayMs).toISOString(),
        });
        failed += 1;
      }
    }

    await this.dependencies.auditService.record({
      scope: 'finance.collections.dispatch',
      entityType: 'collection',
      entityId: null,
      action: 'dispatch_due_schedules',
      status: 'success',
      summary: `Dispatch financeiro processou ${schedules.length} réguas`,
      details: { processed: schedules.length, sent, failed },
      actor: input.actor,
    });

    return {
      processed: schedules.length,
      sent,
      failed,
    };
  }
}

function readScheduledFor(attempt: any) {
  if (!attempt?.providerPayload || typeof attempt.providerPayload !== 'object') return null;
  const payload = attempt.providerPayload as Record<string, unknown>;
  return typeof payload.scheduledFor === 'string' ? payload.scheduledFor : null;
}
