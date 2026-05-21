const test = require('node:test');
const assert = require('node:assert/strict');

test('FinanceCollectionDispatchJob sends due schedules, records attempts and reschedules next run', async () => {
  const {
    FinanceCollectionsService,
    InMemoryFinanceCollectionsRepository,
  } = require('../../../dist/finance/collections/finance-collections.service.js');
  const { FinanceCollectionDispatchJob } = require('../../../dist/jobs/finance/finance-collection-dispatch.job.js');
  const { FinanceAuditService, InMemoryFinanceAuditRepository } = require('../../../dist/finance/shared/audit.js');

  const repository = new InMemoryFinanceCollectionsRepository({
    entries: [
      {
        id: 303,
        type: 'receivable',
        status: 'overdue',
        description: 'Honorarios maio',
        amountCents: 250000,
        dueDate: '2026-05-15',
      },
    ],
  });
  const auditService = new FinanceAuditService(new InMemoryFinanceAuditRepository());
  const service = new FinanceCollectionsService({ repository, auditService });

  const scheduled = await service.schedule({
    entryId: 303,
    channel: 'email',
    cadenceDays: 5,
    maxAttempts: 3,
    startsAt: '2026-05-21T08:00:00.000Z',
    actor: { source: 'user', userId: 3, role: 'FIN' },
    idempotencyKey: 'dispatchable-303',
  });

  let sendCalls = 0;
  const job = new FinanceCollectionDispatchJob({
    repository,
    auditService,
    resolveDestination: () => 'cliente@lexora.test',
    transport: {
      async send(command) {
        sendCalls += 1;
        return {
          providerMessageId: `msg-${command.scheduleId}-${command.attemptNumber}`,
          acceptedAt: '2026-05-21T08:00:10.000Z',
          providerPayload: { transport: 'mock', destination: command.destination },
        };
      },
    },
  });

  const result = await job.runDueSchedules({
    now: '2026-05-21T08:30:00.000Z',
    actor: { source: 'system', role: 'FIN' },
  });

  const attempts = await repository.listAttemptsByScheduleId(scheduled.schedule.id);
  const refreshed = await repository.getScheduleById(scheduled.schedule.id);

  assert.equal(sendCalls, 1);
  assert.equal(result.processed, 1);
  assert.equal(result.sent, 1);
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].status, 'sent');
  assert.equal(refreshed.status, 'scheduled');
  assert.equal(refreshed.nextRunAt, '2026-05-26T08:00:00.000Z');
});

test('FinanceCollectionDispatchJob retries failed deliveries without duplicating the same attempt', async () => {
  const {
    FinanceCollectionsService,
    InMemoryFinanceCollectionsRepository,
  } = require('../../../dist/finance/collections/finance-collections.service.js');
  const { FinanceCollectionDispatchJob } = require('../../../dist/jobs/finance/finance-collection-dispatch.job.js');
  const { FinanceAuditService, InMemoryFinanceAuditRepository } = require('../../../dist/finance/shared/audit.js');

  const repository = new InMemoryFinanceCollectionsRepository({
    entries: [
      {
        id: 404,
        type: 'receivable',
        status: 'overdue',
        description: 'Parcela em aberto',
        amountCents: 50000,
        dueDate: '2026-05-01',
      },
    ],
  });
  const auditService = new FinanceAuditService(new InMemoryFinanceAuditRepository());
  const service = new FinanceCollectionsService({ repository, auditService });

  const scheduled = await service.schedule({
    entryId: 404,
    channel: 'whatsapp',
    cadenceDays: 2,
    maxAttempts: 2,
    startsAt: '2026-05-21T07:00:00.000Z',
    actor: { source: 'user', userId: 9, role: 'FIN' },
  });

  let sendCalls = 0;
  const job = new FinanceCollectionDispatchJob({
    repository,
    auditService,
    retryDelayMs: 300000,
    resolveDestination: () => '+5511999999999',
    transport: {
      async send() {
        sendCalls += 1;
        throw new Error('gateway offline');
      },
    },
  });

  const firstRun = await job.runDueSchedules({
    now: '2026-05-21T07:05:00.000Z',
    actor: { source: 'system', role: 'FIN' },
  });
  const secondRun = await job.runDueSchedules({
    now: '2026-05-21T07:05:00.000Z',
    actor: { source: 'system', role: 'FIN' },
  });

  const attempts = await repository.listAttemptsByScheduleId(scheduled.schedule.id);
  const refreshed = await repository.getScheduleById(scheduled.schedule.id);

  assert.equal(sendCalls, 1);
  assert.equal(firstRun.failed, 1);
  assert.equal(secondRun.failed, 0);
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].status, 'failed');
  assert.equal(refreshed.nextRunAt, '2026-05-21T07:10:00.000Z');
  assert.equal(refreshed.status, 'failed');
});
