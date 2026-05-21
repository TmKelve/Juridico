const test = require('node:test');
const assert = require('node:assert/strict');

test('CreateDeadlineFromPublicationService creates deadline, agenda contract and audit trail with retry metadata', async () => {
  const {
    CreateDeadlineFromPublicationService,
    InMemoryDeadlineAutomationStore,
    InMemoryDeadlineAutomationAgendaGateway,
  } = require('../../../dist/publications/deadline-automation/create-from-publication.service.js');

  const store = new InMemoryDeadlineAutomationStore();
  const agendaGateway = new InMemoryDeadlineAutomationAgendaGateway({
    failTimes: 2,
  });

  const service = new CreateDeadlineFromPublicationService({
    store,
    agendaGateway,
    now: () => new Date('2026-05-21T13:00:00.000Z'),
    maxAgendaRetries: 3,
  });

  const result = await service.execute({
    idempotencyKey: 'pub:551|process:3|create-deadline',
    actor: 'user:9',
    publication: {
      id: 551,
      processId: 3,
      processTitle: 'Acao de cumprimento',
      processPhase: 'Recursal',
      clientId: 8,
      clientName: 'Cliente Nexo',
      publishedAt: '2026-05-20T09:00:00.000Z',
      tribunal: 'TJSP',
      summary: 'Intimacao para manifestacao em 48 horas.',
      impact: 'critico',
    },
    request: {
      dueDate: '2026-05-22',
      title: 'Prazo de manifestacao',
      notes: 'Criado automaticamente da publicacao 551.',
      responsible: 'time-contencioso',
      createAgendaEvent: true,
    },
  });

  assert.equal(result.outcome, 'created');
  assert.equal(result.deadline.origin, 'publicacao');
  assert.equal(result.deadline.processId, 3);
  assert.equal(result.deadline.title, 'Prazo de manifestacao');
  assert.equal(result.idempotency.status, 'completed');
  assert.equal(result.idempotency.replayed, false);
  assert.equal(result.idempotency.retryCount, 2);
  assert.equal(result.risk.level, 'critico');
  assert.equal(result.risk.reasons[0].code, 'DUE_IN_24H');
  assert.equal(result.auditEvent.eventType, 'deadline_created_from_publication');
  assert.equal(result.auditEvent.status, 'success');
  assert.equal(result.auditEvent.details.agendaEventId, 'agenda-1');
  assert.equal(result.agendaEvent.action, 'upsert');
  assert.equal(result.agendaEvent.externalKey, 'deadline:1');
  assert.equal(result.agendaEvent.payload.eventType, 'prazo_calendario');
});

test('CreateDeadlineFromPublicationService returns cached result for repeated idempotency key', async () => {
  const {
    CreateDeadlineFromPublicationService,
    InMemoryDeadlineAutomationStore,
    InMemoryDeadlineAutomationAgendaGateway,
  } = require('../../../dist/publications/deadline-automation/create-from-publication.service.js');

  const store = new InMemoryDeadlineAutomationStore();
  const agendaGateway = new InMemoryDeadlineAutomationAgendaGateway();
  const service = new CreateDeadlineFromPublicationService({
    store,
    agendaGateway,
    now: () => new Date('2026-05-21T13:00:00.000Z'),
  });

  const input = {
    idempotencyKey: 'pub:551|process:3|create-deadline',
    actor: 'user:9',
    publication: {
      id: 551,
      processId: 3,
      processTitle: 'Acao de cumprimento',
      processPhase: 'Recursal',
      clientId: 8,
      clientName: 'Cliente Nexo',
      publishedAt: '2026-05-20T09:00:00.000Z',
      tribunal: 'TJSP',
      summary: 'Intimacao para manifestacao em 48 horas.',
      impact: 'critico',
    },
    request: {
      dueDate: '2026-05-22',
      createAgendaEvent: true,
    },
  };

  const first = await service.execute(input);
  const second = await service.execute(input);

  assert.equal(first.deadline.id, second.deadline.id);
  assert.equal(second.outcome, 'duplicate');
  assert.equal(second.idempotency.status, 'replayed');
  assert.equal(second.idempotency.replayed, true);
  assert.equal(agendaGateway.commands.length, 1);
});
