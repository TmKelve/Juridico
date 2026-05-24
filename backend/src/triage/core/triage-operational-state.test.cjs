const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'triage', 'core', 'triage-operational-state.js');

test('allows supported operational transitions and blocks invalid ones', async () => {
  const { transitionTriageOperationalState } = require(modulePath);

  const escalated = transitionTriageOperationalState({
    currentStatus: 'pendente',
    nextDecisionType: 'escalado',
    actor: 'user:7',
    now: new Date('2026-05-22T12:00:00.000Z'),
    assignedQueue: 'fila_especialista',
  });

  assert.equal(escalated.status, 'escalado');
  assert.equal(escalated.assignedQueue, 'fila_especialista');
  assert.equal(escalated.handledBy, 'user:7');
  assert.equal(escalated.handledAt, '2026-05-22T12:00:00.000Z');

  assert.throws(
    () =>
      transitionTriageOperationalState({
        currentStatus: 'confirmado',
        nextDecisionType: 'confirmado',
        actor: 'user:9',
        now: new Date('2026-05-22T12:30:00.000Z'),
      }),
    /TRIAGE_STATE_INVALID/,
  );
});
