const test = require('node:test');
const assert = require('node:assert/strict');

test('FinanceCollectionsService schedules an idempotent receivable collection flow', async () => {
  const {
    FinanceCollectionsService,
    InMemoryFinanceCollectionsRepository,
  } = require('../../../dist/finance/collections/finance-collections.service.js');
  const { FinanceAuditService, InMemoryFinanceAuditRepository } = require('../../../dist/finance/shared/audit.js');

  const repository = new InMemoryFinanceCollectionsRepository({
    entries: [
      {
        id: 101,
        type: 'receivable',
        status: 'overdue',
        description: 'Mensalidade abril',
        amountCents: 150000,
        dueDate: '2026-05-10',
      },
    ],
  });
  const auditService = new FinanceAuditService(new InMemoryFinanceAuditRepository());
  const service = new FinanceCollectionsService({ repository, auditService });

  const first = await service.schedule({
    entryId: 101,
    channel: 'email',
    cadenceDays: 3,
    maxAttempts: 4,
    startsAt: '2026-05-21T09:00:00.000Z',
    actor: { source: 'user', userId: 7, role: 'FIN' },
    idempotencyKey: 'schedule-101-email',
  });

  const replay = await service.schedule({
    entryId: 101,
    channel: 'email',
    cadenceDays: 3,
    maxAttempts: 4,
    startsAt: '2026-05-21T09:00:00.000Z',
    actor: { source: 'user', userId: 7, role: 'FIN' },
    idempotencyKey: 'schedule-101-email',
  });

  assert.equal(first.idempotency.mode, 'created');
  assert.equal(replay.idempotency.mode, 'replayed');
  assert.equal(first.schedule.entryId, 101);
  assert.equal(first.schedule.status, 'scheduled');
  assert.equal(first.schedule.nextRunAt, '2026-05-21T09:00:00.000Z');
  assert.equal((await repository.listSchedules()).length, 1);
  assert.equal(first.auditEvent.entityType, 'collection');
  assert.equal(first.auditEvent.action, 'schedule_created');
});

test('FinanceCollectionsService rejects schedule creation for non-chargeable entries', async () => {
  const {
    FinanceCollectionsService,
    InMemoryFinanceCollectionsRepository,
  } = require('../../../dist/finance/collections/finance-collections.service.js');
  const { FinanceAuditService, InMemoryFinanceAuditRepository } = require('../../../dist/finance/shared/audit.js');

  const repository = new InMemoryFinanceCollectionsRepository({
    entries: [
      {
        id: 202,
        type: 'payable',
        status: 'open',
        description: 'Fornecedor XPTO',
        amountCents: 90000,
        dueDate: '2026-05-25',
      },
    ],
  });
  const auditService = new FinanceAuditService(new InMemoryFinanceAuditRepository());
  const service = new FinanceCollectionsService({ repository, auditService });

  await assert.rejects(
    () =>
      service.schedule({
        entryId: 202,
        channel: 'whatsapp',
        cadenceDays: 2,
        maxAttempts: 3,
        startsAt: '2026-05-22T10:00:00.000Z',
        actor: { source: 'user', userId: 5, role: 'FIN' },
      }),
    (error) => {
      assert.equal(error.code, 'FIN_COLLECTION_INVALID');
      return true;
    },
  );
});
