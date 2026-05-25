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
  'http',
  'triage-command-helpers.js',
);

test('buildPrioritizeCommandResult returns contract-ready prioritization for target item', async () => {
  const { buildPrioritizeCommandResult } = require(modulePath);

  const result = buildPrioritizeCommandResult({
    triageItemId: 22,
    now: new Date('2026-05-24T12:00:00.000Z'),
    items: [
      {
        id: 22,
        queueType: 'critica',
        status: 'escalado',
        createdAt: new Date('2026-05-24T07:00:00.000Z'),
        priorityScore: 92,
        priorityReasons: ['prazo fatal'],
        sourceType: 'diario_oficial',
      },
      {
        id: 23,
        queueType: 'normal',
        status: 'pendente',
        createdAt: new Date('2026-05-24T11:00:00.000Z'),
        priorityScore: 30,
        priorityReasons: ['rotina'],
        sourceType: 'manual',
      },
    ],
  });

  assert.equal(result.triageItemId, 22);
  assert.equal(result.priorityLabel, 'critica');
  assert.equal(result.queueRank, 1);
  assert.equal(result.breached, true);
  assert.ok(result.agingHours >= 5);
});

test('runTriageDecisionIdempotent maps generic idempotency conflicts to triage contract conflict', async () => {
  const { runTriageDecisionIdempotent } = require(modulePath);

  await assert.rejects(
    () =>
      runTriageDecisionIdempotent({
        auditService: {
          async runIdempotent() {
            const error = new Error('idempotencyKey já foi usado em outra operação');
            error.name = 'CrmContractError';
            error.statusCode = 409;
            error.code = 'IDEMPOTENCY_CONFLICT';
            error.details = { key: 'triage:1' };
            throw error;
          },
        },
        triageItemId: 1,
        idempotencyKey: 'triage:1',
        payload: { decisionType: 'confirmado' },
        execute: async () => ({ ok: true }),
      }),
    (error) => {
      assert.equal(error.code, 'TRIAGE_DECISION_CONFLICT');
      assert.equal(error.statusCode, 409);
      return true;
    },
  );
});
