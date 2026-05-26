const test = require('node:test');
const assert = require('node:assert/strict');

test('buildPublicationCaptureRecord computes additive origin fields for legacy capture rows', async () => {
  const {
    adaptLegacyPublicationCaptureRow,
  } = require('../../../dist/publications/capture/publication-origin-capture.builders.js');

  const record = adaptLegacyPublicationCaptureRow({
    id: 42,
    sourceType: 'cnj',
    sourceReference: ' CNJ-REF-01 ',
    occurredAt: '2026-05-26T13:00:00.000Z',
    rawText: 'Texto bruto',
    normalizedText: 'Texto normalizado',
    tribunal: 'TJSP',
    processNumber: '0001234-55.2026.8.26.0001',
    cpf: '123.456.789-00',
    personName: 'Maria Souza',
    metadataJson: { page: 3 },
  });

  assert.equal(record.id, 42);
  assert.equal(record.originStage, 'capturado');
  assert.equal(record.pipelineStatus, 'capturado');
  assert.equal(record.consolidationStatus, 'nao_consolidado');
  assert.equal(record.sourceReference, 'CNJ-REF-01');
  assert.equal(record.metadata.page, 3);
  assert.ok(record.correlationId.startsWith('pub-origin:cnj:00012345520268260001:'));
});

test('buildPublicationNormalizedRecord upgrades origin stage when publication already exists', async () => {
  const {
    buildPublicationNormalizedRecord,
  } = require('../../../dist/publications/capture/publication-origin-capture.builders.js');

  const event = buildPublicationNormalizedRecord({
    id: 12,
    captureId: 42,
    publicationId: 77,
    sourceType: 'diario',
    sourceReference: 'DJE-77',
    title: 'Intimação',
    summary: 'Prazo aberto',
    fullText: 'Texto da publicação',
    requiresAction: true,
    riskLevel: 'alto',
    eventAt: '2026-05-26T13:05:00.000Z',
  });

  assert.equal(event.originStage, 'consolidado');
  assert.equal(event.pipelineStatus, 'consolidado');
  assert.equal(event.riskLevel, 'alto');
  assert.equal(event.requiresAction, true);
});
