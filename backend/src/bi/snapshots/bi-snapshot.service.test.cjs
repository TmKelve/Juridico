const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'bi', 'snapshots', 'bi-snapshot.service.js');

test('InMemoryBiSnapshotService stores generated metric snapshots', async () => {
  const { InMemoryBiSnapshotService } = require(modulePath);

  const service = new InMemoryBiSnapshotService();
  const created = await service.store({
    scopeType: 'team',
    scopeId: '9',
    referenceDate: '2026-05-31',
    windowFrom: '2026-05-01',
    windowTo: '2026-05-31',
    generatedBy: 'system',
    metrics: [
      {
        metricKey: 'productivity.tasks.completed',
        label: 'Tarefas concluídas',
        value: 12,
        delta: null,
        series: [],
        definitionVersion: 'l-v1',
        snapshotId: null,
      },
    ],
  });

  assert.equal(created.length, 1);
  assert.equal(created[0].metricKey, 'productivity.tasks.completed');
  assert.equal((await service.list('productivity.tasks.completed')).length, 1);
});
