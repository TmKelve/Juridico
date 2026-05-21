const test = require('node:test');
const assert = require('node:assert/strict');

test('PublicationReprocessService creates a dead-letter entry for eligible failures', async () => {
  const { InMemoryPublicationAuditSink } = require('../../../dist/publications/audit/publication-audit.service.js');
  const { PublicationReprocessService } = require('../../../dist/publications/reprocess/publication-reprocess.service.js');

  const sink = new InMemoryPublicationAuditSink();
  const service = new PublicationReprocessService({ auditSink: sink, maxAttempts: 3 });

  const result = await service.requestReprocess({
    failedEvent: {
      eventType: 'pipeline_failed',
      status: 'error',
      publicationId: 551,
      captureId: 902,
      jobId: 44,
      processId: 3,
      actor: 'system',
      occurredAt: '2026-05-20T09:05:18.000Z',
      details: {
        code: 'PUB_PIPELINE_FAILURE',
        stage: 'automate',
        fingerprint: 'cnj|ref-1|10024567820265020001',
      },
    },
    actor: 'user:9',
    reason: 'retry_automation',
  });

  assert.equal(result.deadLetter.status, 'pending_reprocess');
  assert.equal(result.deadLetter.errorCode, 'PUB_PIPELINE_FAILURE');
  assert.equal(result.deadLetter.attemptCount, 1);
  assert.equal(result.auditEvents[0].eventType, 'reprocess_requested');
  assert.equal(result.auditEvents[1].eventType, 'reprocess_completed');
});

test('PublicationReprocessService rejects unsupported events', async () => {
  const { InMemoryPublicationAuditSink } = require('../../../dist/publications/audit/publication-audit.service.js');
  const { PublicationReprocessService } = require('../../../dist/publications/reprocess/publication-reprocess.service.js');

  const sink = new InMemoryPublicationAuditSink();
  const service = new PublicationReprocessService({ auditSink: sink, maxAttempts: 3 });

  await assert.rejects(
    () =>
      service.requestReprocess({
        failedEvent: {
          eventType: 'automation_executed',
          status: 'success',
          publicationId: 551,
          captureId: 902,
          jobId: 44,
          processId: 3,
          actor: 'system',
          occurredAt: '2026-05-20T09:05:18.000Z',
          details: {},
        },
        actor: 'user:9',
        reason: 'manual_retry',
      }),
    (error) => {
      assert.equal(error.code, 'PUB_REPROCESS_NOT_ALLOWED');
      return true;
    },
  );
});
