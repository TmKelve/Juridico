const test = require('node:test');
const assert = require('node:assert/strict');

test('PublicationAuditService records and queries an auditable trail', async () => {
  const { InMemoryPublicationAuditSink, PublicationAuditService } = require('../../../dist/publications/audit/publication-audit.service.js');

  const sink = new InMemoryPublicationAuditSink();
  const service = new PublicationAuditService({ sink });

  await service.record({
    eventType: 'pipeline_failed',
    status: 'error',
    publicationId: 551,
    captureId: 902,
    jobId: 44,
    processId: 3,
    actor: 'system',
    details: { code: 'PUB_PIPELINE_FAILURE', stage: 'match' },
    occurredAt: '2026-05-20T09:07:00.000Z',
  });

  await service.record({
    eventType: 'reprocess_requested',
    status: 'warning',
    publicationId: 551,
    captureId: 902,
    jobId: 44,
    processId: 3,
    actor: 'user:7',
    details: { reason: 'manual_retry' },
    occurredAt: '2026-05-20T09:06:00.000Z',
  });

  const trail = await service.query({ publicationId: 551 });

  assert.equal(trail.length, 2);
  assert.equal(trail[0].eventType, 'pipeline_failed');
  assert.equal(trail[0].status, 'error');
  assert.equal(trail[0].details.code, 'PUB_PIPELINE_FAILURE');
  assert.equal(trail[1].eventType, 'reprocess_requested');
});
