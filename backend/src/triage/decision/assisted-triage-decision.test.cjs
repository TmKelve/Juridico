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

