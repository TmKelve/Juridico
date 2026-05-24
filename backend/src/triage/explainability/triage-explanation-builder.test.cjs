const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'dist',
  'triage',
  'explainability',
  'triage-explanation-builder.js',
);

test('buildTriageExplanation materializes summary, rules and matched signals', async () => {
  const { buildTriageExplanation } = require(modulePath);

  const explanation = buildTriageExplanation({
    triageItem: {
      id: 45,
      queueType: 'normal',
      suggestedAction: 'criar_tarefa',
      suggestedReason: 'Despacho com providencia interna.',
      processId: 15,
      clientId: 33,
      aiConfidenceBand: 'media',
      priorityReasons: ['cliente ativo', 'andamento recente'],
      process: { phase: 'Conhecimento', client: 'Cliente Atlas' },
      clientRecord: { name: 'Cliente Atlas' },
      capture: {
        normalizedText: 'Juntar documento complementar em 5 dias.',
        sourceReference: 'DJSP-45',
      },
      event: {
        publicationId: 801,
        title: 'Despacho para juntada',
      },
    },
    decisionType: 'confirmado',
    decisionReason: 'Providencia validada',
  });

  assert.match(explanation.summary, /Decisao confirmado para item 45/);
  assert.ok(explanation.appliedRules.includes('decision:confirmado'));
  assert.ok(explanation.appliedRules.includes('target:process-linked'));
  assert.ok(explanation.matchedSignals.includes('DJSP-45'));
  assert.ok(explanation.matchedSignals.some((value) => value.startsWith('texto:')));
  assert.deepEqual(explanation.priorityReasons, [
    'cliente ativo',
    'andamento recente',
    'Despacho com providencia interna.',
    'Providencia validada',
  ]);
});

