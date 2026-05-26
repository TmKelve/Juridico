const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const decisionEnginePath = path.resolve(__dirname, '..', '..', 'dist', 'triage', 'decision-engine.js');

test('plans confirmed deadline automation with dedupeKey and handled state', async () => {
  const { planTriageDecision, planBatchTriageDecisions } = require(decisionEnginePath);

  const triageItem = {
    id: 778,
    queueType: 'critica',
    suggestedAction: 'criar_prazo',
    suggestedReason: 'Prazo recursal identificado no texto normalizado.',
    processId: 3,
    clientId: 8,
    crmLeadId: null,
    crmOpportunityId: null,
    assignedQueue: 'fila_central',
    discardReason: null,
    discardNote: null,
    postponeUntil: null,
    process: { phase: 'Recursal', client: 'Cliente Nexo' },
    clientRecord: { name: 'Cliente Nexo' },
    capture: {
      normalizedText: 'Intimem-se as partes para manifestacao em 15 dias.',
      occurredAt: new Date('2026-05-20T09:00:00.000Z'),
      sourceReference: 'DJSP-2026-05-20-00019',
    },
    event: {
      publicationId: 551,
      title: 'Intimacao para manifestacao',
    },
  };

  const planned = planTriageDecision({
    triageItem,
    decision: {
      decisionType: 'confirmado',
      dueDate: '2026-06-04',
      taskDueDate: '2026-06-03',
    },
    actor: 'advogado',
    now: new Date('2026-05-20T09:05:18.000Z'),
  });

  assert.equal(planned.itemUpdate.status, 'confirmado');
  assert.equal(planned.itemUpdate.queueType, 'tratados');
  assert.equal(planned.automation.commandType, 'create_deadline_and_task');
  assert.equal(planned.automation.dedupeKey, 'pub:551|process:3|deadline-and-task');
  assert.equal(planned.automation.task.priority, 'alta');
  assert.equal(planned.automation.deadline.dueDate, '2026-06-04');
  assert.equal(planned.automation.correlationId, 'pub:551');
  assert.equal(planned.automation.derivedActions.length, 2);
  assert.equal(planned.automation.derivedActions[0].entityType, 'deadline');
  assert.equal(planned.automation.derivedActions[1].entityType, 'task');
  assert.equal(planned.automation.fallbacks.length, 0);

  const batch = planBatchTriageDecisions({
    items: [triageItem, { ...triageItem, id: 779 }],
    decision: { decisionType: 'confirmado' },
    actor: 'advogado',
    existingDedupeKeys: new Set(['pub:551|process:3|deadline-and-task']),
    now: new Date('2026-05-20T09:05:18.000Z'),
  });

  assert.equal(batch[0].automation.commandType, 'none');
  assert.equal(batch[0].automation.skipReason, 'duplicate_dedupe_key');
  assert.equal(batch[0].automation.fallbacks[0].code, 'duplicate_dedupe_key');
  assert.equal(batch[1].automation.commandType, 'none');
});

test('plans confirmed task-only automation and postponed state without mutating CRM ids', async () => {
  const { planTriageDecision } = require(decisionEnginePath);

  const taskItem = {
    id: 901,
    queueType: 'normal',
    suggestedAction: 'criar_tarefa',
    suggestedReason: 'Despacho sem prazo fatal, mas com providencia necessaria.',
    processId: 7,
    clientId: 3,
    crmLeadId: 12,
    crmOpportunityId: 18,
    assignedQueue: 'fila_operacional',
    discardReason: null,
    discardNote: null,
    postponeUntil: null,
    process: { phase: 'Conhecimento', client: 'Cliente Atlas' },
    clientRecord: { name: 'Cliente Atlas' },
    capture: {
      normalizedText: 'Junte a parte autora os documentos faltantes.',
      occurredAt: new Date('2026-05-20T09:00:00.000Z'),
      sourceReference: 'DJSP-2026-05-20-00020',
    },
    event: {
      publicationId: 552,
      title: 'Despacho para juntada',
    },
  };

  const confirmed = planTriageDecision({
    triageItem: taskItem,
    decision: { decisionType: 'confirmado', taskOwner: 'time-contencioso' },
    actor: 'coordenador',
    now: new Date('2026-05-20T10:00:00.000Z'),
  });

  assert.equal(confirmed.automation.commandType, 'create_task');
  assert.equal(confirmed.automation.dedupeKey, 'pub:552|process:7|task');
  assert.equal(confirmed.automation.task.owner, 'time-contencioso');
  assert.equal(confirmed.automation.derivedActions.length, 1);
  assert.equal(confirmed.automation.derivedActions[0].entityType, 'task');
  assert.equal(confirmed.itemUpdate.crmLeadId, 12);
  assert.equal(confirmed.itemUpdate.crmOpportunityId, 18);

  const postponed = planTriageDecision({
    triageItem: taskItem,
    decision: {
      decisionType: 'adiado',
      postponeUntil: '2026-05-30T12:00:00.000Z',
      assignedQueue: 'fila_documental',
    },
    actor: 'coordenador',
    now: new Date('2026-05-20T10:00:00.000Z'),
  });

  assert.equal(postponed.itemUpdate.status, 'adiado');
  assert.equal(postponed.itemUpdate.queueType, 'normal');
  assert.equal(postponed.itemUpdate.assignedQueue, 'fila_documental');
  assert.equal(postponed.automation.commandType, 'none');
  assert.equal(postponed.automation.fallbacks[0].code, 'not_confirmed');
});
