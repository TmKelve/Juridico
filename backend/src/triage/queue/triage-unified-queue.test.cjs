const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'triage', 'queue', 'triage-unified-queue.js');

test('ranks unified triage queue with dynamic priority and SLA breach precedence', async () => {
  const { rankUnifiedTriageQueue } = require(modulePath);

  const queue = rankUnifiedTriageQueue({
    now: new Date('2026-05-22T12:00:00.000Z'),
    items: [
      {
        id: 10,
        queueType: 'normal',
        status: 'pendente',
        createdAt: '2026-05-22T08:00:00.000Z',
        priorityScore: 68,
        priorityReasons: ['cliente vip'],
        sourceType: 'manual',
      },
      {
        id: 11,
        queueType: 'critica',
        status: 'pendente',
        createdAt: '2026-05-22T07:00:00.000Z',
        priorityScore: 62,
        priorityReasons: ['prazo fatal'],
        sourceType: 'diario_oficial',
      },
      {
        id: 12,
        queueType: 'normal',
        status: 'adiado',
        createdAt: '2026-05-22T03:00:00.000Z',
        postponeUntil: '2026-05-22T15:00:00.000Z',
        priorityScore: 95,
        priorityReasons: ['retorno de coordenacao'],
        sourceType: 'manual',
      },
    ],
  });

  assert.deepEqual(
    queue.map((item) => item.id),
    [11, 10, 12],
  );

  assert.equal(queue[0].priorityLabel, 'alta');
  assert.equal(queue[0].breached, true);
  assert.equal(queue[0].queueRank, 1);

  assert.equal(queue[1].priorityLabel, 'media');
  assert.equal(queue[1].breached, false);
  assert.equal(queue[1].queueRank, 2);

  assert.equal(queue[2].operationalBucket, 'backlog_adiado');
  assert.equal(queue[2].queueRank, 3);
});
