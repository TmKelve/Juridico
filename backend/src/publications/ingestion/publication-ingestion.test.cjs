const test = require('node:test');
const assert = require('node:assert/strict');

test('createPublicationFingerprint normalizes casing, whitespace and truncates output', async () => {
  const { createPublicationFingerprint } = require('../../../dist/publications/ingestion/publication-ingestion.js');

  const fingerprint = createPublicationFingerprint([
    '  CNJ  ',
    'Ref-001',
    'Processo 123',
    '2026-05-20T09:00:00.000Z',
    ` Texto   com    espaços ${'x'.repeat(500)} `,
  ]);

  assert.ok(fingerprint.startsWith('cnj|ref-001|processo 123|2026-05-20t09:00:00.000z|texto com espaços'));
  assert.equal(fingerprint.length, 400);
});

test('preparePublicationCapture yields idempotency data and duplicate status for existing fingerprints', async () => {
  const { preparePublicationCapture } = require('../../../dist/publications/ingestion/publication-ingestion.js');

  const existingCapture = { id: 55, fingerprint: 'diario|ref|123|2026-05-20t09:00:00.000z|texto' };
  const duplicate = preparePublicationCapture({
    sourceType: 'diario',
    triggeredBy: 'manual:user-1',
    payload: {
      sourceReference: 'REF',
      occurredAt: '2026-05-20T09:00:00.000Z',
      processNumber: '123',
      rawText: 'Texto',
      normalizedText: 'Texto',
      tribunal: 'TJSP',
      metadata: { page: 12 },
    },
    existingCapture,
  });

  assert.equal(duplicate.fingerprint, existingCapture.fingerprint);
  assert.equal(duplicate.operation, 'update');
  assert.equal(duplicate.audit.status, 'warning');
  assert.equal(duplicate.audit.errorCode, 'PUB_DUPLICATE');
  assert.equal(duplicate.normalizedPublication.idempotencyKey, 'diario|REF|2026-05-20T09:00:00.000Z|texto');
});
