const test = require('node:test');
const assert = require('node:assert/strict');

test('DeadlineRiskService marks overdue publication deadline without agenda as critical', async () => {
  const { DeadlineRiskService } = require('../../dist/deadlines/deadline-risk.service.js');

  const service = new DeadlineRiskService();
  const result = service.evaluate({
    id: 11,
    processId: 3,
    title: 'Prazo recursal',
    dueDate: '2026-05-20',
    status: 'aberto',
    priority: 'alta',
    origin: 'publicacao',
    publicationId: 551,
    processPhase: 'Recursal',
    agendaEventId: null,
    agendaSyncStatus: 'missing',
    completedAt: null,
  }, {
    now: new Date('2026-05-21T14:30:00.000Z'),
  });

  assert.equal(result.level, 'critico');
  assert.equal(result.score, 100);
  const reasonCodes = result.reasons.map((reason) => reason.code);
  assert.equal(reasonCodes.includes('OVERDUE'), true);
  assert.equal(reasonCodes.includes('PUBLICATION_ORIGIN'), true);
  assert.equal(reasonCodes.includes('NO_AGENDA_EVENT'), true);
});

test('DeadlineRiskService marks completed deadline as low risk and DeadlineAuditService normalizes completion events', async () => {
  const { DeadlineRiskService } = require('../../dist/deadlines/deadline-risk.service.js');
  const { DeadlineAuditService } = require('../../dist/deadlines/deadline-audit.service.js');

  const riskService = new DeadlineRiskService();
  const auditService = new DeadlineAuditService();

  const risk = riskService.evaluate({
    id: 12,
    processId: 3,
    title: 'Prazo de juntada',
    dueDate: '2026-05-25',
    status: 'concluido',
    priority: 'media',
    origin: 'manual',
    publicationId: null,
    processPhase: 'Conhecimento',
    agendaEventId: 'agenda-2',
    agendaSyncStatus: 'synced',
    completedAt: '2026-05-21T10:00:00.000Z',
  }, {
    now: new Date('2026-05-21T14:30:00.000Z'),
  });

  const auditEvent = auditService.recordCompletion({
    actor: 'user:9',
    deadlineId: 12,
    processId: 3,
    publicationId: null,
    source: 'bulk_action',
    reason: 'Baixa operacional.',
    occurredAt: '2026-05-21T14:30:00.000Z',
    risk,
  });

  assert.equal(risk.level, 'baixo');
  assert.equal(auditEvent.eventType, 'deadline_completed');
  assert.equal(auditEvent.status, 'success');
  assert.equal(auditEvent.details.riskLevelAfterCompletion, 'baixo');
});
