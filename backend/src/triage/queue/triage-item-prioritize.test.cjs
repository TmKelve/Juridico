const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'triage', 'queue', 'triage-item-prioritize.js');

test('exposes triage.item.prioritize helper with explicit escalated flow semantics', async () => {
  const { TRIAGE_ITEM_PRIORITIZE, triageItemPrioritize } = require(modulePath);

  const prioritized = triageItemPrioritize({
    now: new Date('2026-05-22T12:00:00.000Z'),
    item: {
      id: 41,
      queueType: 'normal',
      status: 'escalado',
      createdAt: '2026-05-22T07:00:00.000Z',
      priorityScore: 70,
      priorityReasons: ['cliente sensivel'],
      sourceType: 'manual',
    },
  });

  assert.equal(TRIAGE_ITEM_PRIORITIZE, 'triage.item.prioritize');
  assert.equal(prioritized.workflow, 'triage.item.prioritize');
  assert.equal(prioritized.operationalBucket, 'fila_escalada');
  assert.equal(prioritized.slaProfile, 'escalado');
  assert.equal(prioritized.slaTargetAt, '2026-05-22T09:00:00.000Z');
  assert.equal(prioritized.breached, true);
  assert.ok(prioritized.priorityReasons.includes('cliente sensivel'));
  assert.ok(prioritized.priorityReasons.includes('state:escalado'));
});
