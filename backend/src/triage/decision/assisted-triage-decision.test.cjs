const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'triage', 'decision', 'assisted-triage-decision.js');

test('assistTriageDecision projects contract-friendly decision output with automation commands', async () => {
  const { assistTriageDecision } = require(modulePath);

  const triageItem = {
    id: 114,
    queueType: 'critica',
    suggestedAction: 'criar_prazo',
    suggestedReason: 'Prazo recursal identificado.',
    processId: 22,
    clientId: 8,
    crmLeadId: null,
    crmOpportunityId: null,
    assignedQueue: 'fila_central',
    discardReason: null,
    discardNote: null,
    postponeUntil: null,
    aiConfidenceBand: 'alta',
    priorityReasons: ['prazo fatal', 'risco processual'],
    process: { phase: 'Recursal', client: 'Cliente Nexo' },
    clientRecord: { name: 'Cliente Nexo' },
    capture: {
      normalizedText: 'Intimacao para apresentar contrarrazoes em 15 dias.',
      occurredAt: new Date('2026-05-22T09:00:00.000Z'),
      sourceReference: 'DJSP-2026-05-22-00114',
    },
    event: {
      publicationId: 991,
      title: 'Intimacao para contrarrazoes',
    },
  };

  const assisted = assistTriageDecision({
    triageItem,
    decision: {
      triageItemId: 114,
      decisionType: 'confirmado',
      decisionReason: 'Prazo processual confirmado',
      idempotencyKey: 'triage:114:confirmado',
      dueDate: '2026-05-30',
      taskDueDate: '2026-05-29',
    },
    actor: 'user:7',
    now: new Date('2026-05-22T09:05:00.000Z'),
  });

  assert.equal(assisted.command.actor, 'user:7');
  assert.equal(assisted.projection.status, 'confirmado');
  assert.equal(assisted.projection.automationPlanned, true);
  assert.deepEqual(assisted.projection.automationCommandIds, [
    'create_deadline_and_task:114:pub:991|process:22|deadline-and-task',
  ]);
  assert.equal(assisted.explanation.confidenceBand, 'alta');
  assert.equal(assisted.automation.commands[0].dedupeKey, 'pub:991|process:22|deadline-and-task');
});

test('assistTriageDecision rejects invalid escalated decisions without assigned queue', async () => {
  const { assistTriageDecision } = require(modulePath);

  assert.throws(
    () =>
      assistTriageDecision({
        triageItem: {
          id: 90,
          queueType: 'normal',
          suggestedAction: 'criar_tarefa',
          suggestedReason: 'Providencia operacional.',
          processId: 5,
          clientId: 4,
          capture: {
            normalizedText: 'Providencia necessaria.',
            sourceReference: 'MANUAL-90',
          },
        },
        decision: {
          triageItemId: 90,
          decisionType: 'escalado',
          idempotencyKey: 'triage:90:escalado',
        },
        actor: 'system',
        now: new Date('2026-05-22T09:05:00.000Z'),
      }),
    /TRIAGE_DECISION_INVALID/,
  );
});

test('assistTriageDecision keeps escalated status and produces coherent explanation without automation', async () => {
  const { assistTriageDecision } = require(modulePath);

  const assisted = assistTriageDecision({
    triageItem: {
      id: 91,
      queueType: 'normal',
      suggestedAction: 'criar_tarefa',
      suggestedReason: 'Caso exige analise especializada.',
      processId: 6,
      clientId: 5,
      assignedQueue: 'fila_operacional',
      process: { phase: 'Conhecimento', client: 'Cliente Escala' },
      clientRecord: { name: 'Cliente Escala' },
      capture: {
        normalizedText: 'Tema sensivel com necessidade de escalonamento.',
        sourceReference: 'MANUAL-91',
      },
    },
    decision: {
      triageItemId: 91,
      decisionType: 'escalado',
      decisionReason: 'Escalar para fila especializada',
      assignedQueue: 'fila_especializada',
      idempotencyKey: 'triage:91:escalado',
    },
    actor: 'user:12',
    now: new Date('2026-05-22T10:00:00.000Z'),
  });

  assert.equal(assisted.projection.status, 'escalado');
  assert.equal(assisted.projection.automationPlanned, false);
  assert.deepEqual(assisted.projection.automationCommandIds, []);
  assert.equal(assisted.projection.itemUpdate.assignedQueue, 'fila_especializada');
  assert.match(assisted.explanation.summary, /Decisao escalado para item 91/);
  assert.ok(assisted.explanation.appliedRules.includes('decision:escalado'));
  assert.ok(assisted.explanation.priorityReasons.includes('Escalar para fila especializada'));
  assert.equal(assisted.automation.skippedReason, 'not_confirmed');
});
