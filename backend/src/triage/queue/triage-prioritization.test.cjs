const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'triage', 'queue', 'triage-prioritization.js');

test('prioritizes one triage item with dynamic score, label and SLA snapshot', async () => {
  const { prioritizeTriageItem } = require(modulePath);

  const prioritized = prioritizeTriageItem({
    now: new Date('2026-05-22T12:00:00.000Z'),
    item: {
      id: 31,
      queueType: 'critica',
      status: 'pendente',
      createdAt: '2026-05-22T07:00:00.000Z',
      priorityScore: 62,
      priorityReasons: ['prazo fatal'],
      sourceType: 'diario_oficial',
    },
  });

  assert.equal(prioritized.triageItemId, 31);
  assert.equal(prioritized.priorityLabel, 'alta');
  assert.equal(prioritized.breached, true);
  assert.equal(prioritized.agingHours, 5);
  assert.equal(prioritized.operationalBucket, 'fila_ativa');
  assert.ok(prioritized.priorityReasons.includes('prazo fatal'));
  assert.ok(prioritized.priorityReasons.includes('queue:critica'));
  assert.ok(prioritized.priorityReasons.includes('sla:breached'));
});
