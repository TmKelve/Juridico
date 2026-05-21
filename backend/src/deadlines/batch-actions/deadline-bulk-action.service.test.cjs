const test = require('node:test');
const assert = require('node:assert/strict');

test('DeadlineBulkActionService completes deadlines in batch and emits audit plus agenda completion contracts', async () => {
  const {
    DeadlineBulkActionService,
    InMemoryDeadlineBulkActionStore,
  } = require('../../../dist/deadlines/batch-actions/deadline-bulk-action.service.js');

  const store = new InMemoryDeadlineBulkActionStore([
    {
      id: 1,
      processId: 3,
      processTitle: 'Acao de cumprimento',
      processPhase: 'Recursal',
      clientId: 8,
      clientName: 'Cliente Nexo',
      title: 'Prazo de manifestacao',
      description: null,
      dueDate: '2026-05-22',
      status: 'aberto',
      priority: 'alta',
      origin: 'publicacao',
      responsible: 'time-contencioso',
      createdBy: 'ana',
      completedAt: null,
      publicationId: 551,
      agendaEventId: 'agenda-1',
    },
    {
      id: 2,
      processId: 3,
      processTitle: 'Acao de cumprimento',
      processPhase: 'Recursal',
      clientId: 8,
      clientName: 'Cliente Nexo',
      title: 'Prazo de juntada',
      description: null,
      dueDate: '2026-05-25',
      status: 'concluido',
      priority: 'media',
      origin: 'manual',
      responsible: 'time-contencioso',
      createdBy: 'ana',
      completedAt: '2026-05-21T10:00:00.000Z',
      publicationId: null,
      agendaEventId: null,
    },
  ]);

  const service = new DeadlineBulkActionService({
    store,
    now: () => new Date('2026-05-21T14:30:00.000Z'),
  });

  const result = await service.execute({
    idempotencyKey: 'bulk:complete:1-2',
    actor: 'user:9',
    action: {
      type: 'complete',
      deadlineIds: [1, 2],
      reason: 'Lote concluido pelo coordenador.',
    },
  });

  assert.equal(result.summary.requested, 2);
  assert.equal(result.summary.updated, 1);
  assert.equal(result.summary.skipped, 1);
  assert.equal(result.summary.failed, 0);
  assert.equal(result.auditEvents.length, 1);
  assert.equal(result.auditEvents[0].eventType, 'deadline_completed');
  assert.equal(result.auditEvents[0].details.reason, 'Lote concluido pelo coordenador.');
  assert.equal(result.agendaEvents.length, 1);
  assert.equal(result.agendaEvents[0].action, 'complete');
  assert.equal(result.agendaEvents[0].agendaEventId, 'agenda-1');
  assert.equal(result.items[0].deadline.status, 'concluido');
  assert.equal(result.items[1].status, 'skipped');
});

test('DeadlineBulkActionService replays previous batch result for the same idempotency key', async () => {
  const {
    DeadlineBulkActionService,
    InMemoryDeadlineBulkActionStore,
  } = require('../../../dist/deadlines/batch-actions/deadline-bulk-action.service.js');

  const store = new InMemoryDeadlineBulkActionStore([
    {
      id: 1,
      processId: 3,
      processTitle: 'Acao de cumprimento',
      processPhase: 'Recursal',
      clientId: 8,
      clientName: 'Cliente Nexo',
      title: 'Prazo de manifestacao',
      description: null,
      dueDate: '2026-05-22',
      status: 'aberto',
      priority: 'alta',
      origin: 'publicacao',
      responsible: 'time-contencioso',
      createdBy: 'ana',
      completedAt: null,
      publicationId: 551,
      agendaEventId: 'agenda-1',
    },
  ]);

  const service = new DeadlineBulkActionService({
    store,
    now: () => new Date('2026-05-21T14:30:00.000Z'),
  });

  await service.execute({
    idempotencyKey: 'bulk:reprioritize:1',
    actor: 'user:9',
    action: {
      type: 'reprioritize',
      deadlineIds: [1],
      priority: 'critica',
    },
  });

  const replay = await service.execute({
    idempotencyKey: 'bulk:reprioritize:1',
    actor: 'user:9',
    action: {
      type: 'reprioritize',
      deadlineIds: [1],
      priority: 'critica',
    },
  });

  assert.equal(replay.idempotency.status, 'replayed');
  assert.equal(replay.summary.updated, 1);
  assert.equal(replay.items[0].deadline.priority, 'critica');
});
