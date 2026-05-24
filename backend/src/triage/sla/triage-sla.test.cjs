const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'triage', 'sla', 'triage-sla.js');

test('computes SLA targets, aging hours and breach flag by queue type', async () => {
  const { computeTriageSla } = require(modulePath);

  const now = new Date('2026-05-22T12:00:00.000Z');
  const createdAt = new Date('2026-05-22T06:30:00.000Z');

  const critical = computeTriageSla({
    queueType: 'critica',
    createdAt,
    now,
  });

  assert.equal(critical.slaHours, 4);
  assert.equal(critical.agingHours, 5.5);
  assert.equal(critical.slaTargetAt, '2026-05-22T10:30:00.000Z');
  assert.equal(critical.breached, true);

  const normal = computeTriageSla({
    queueType: 'normal',
    createdAt,
    now,
    postponeUntil: '2026-05-23T12:00:00.000Z',
  });

  assert.equal(normal.slaHours, 24);
  assert.equal(normal.agingHours, 0);
  assert.equal(normal.breached, false);
  assert.equal(normal.slaTargetAt, '2026-05-24T12:00:00.000Z');
});
