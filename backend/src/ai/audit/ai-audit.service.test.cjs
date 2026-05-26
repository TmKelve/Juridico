const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'ai', 'audit', 'ai-audit.service.js');

test('InMemoryAiAuditService records and filters audit events', async () => {
  const { InMemoryAiAuditService } = require(modulePath);

  const service = new InMemoryAiAuditService();
  await service.record({
    executionId: 'exec-1',
    commandKey: 'ai.summary.generate',
    targetType: 'publication',
    targetId: '41',
    actionTaken: 'accepted',
    actor: 'user:7',
    status: 'success',
    promptVersion: 'k-v1',
    modelVersion: 'fallback-v1',
    provider: 'deterministic',
    occurredAt: '2026-05-26T12:00:00.000Z',
  });

  const events = await service.list({ targetType: 'publication', targetId: '41' });
  assert.equal(events.length, 1);
  assert.equal(events[0].executionId, 'exec-1');
  assert.equal(events[0].status, 'success');
});
