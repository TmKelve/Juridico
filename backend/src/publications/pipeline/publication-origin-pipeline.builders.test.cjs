const test = require('node:test');
const assert = require('node:assert/strict');

test('buildPublicationPipelineTimeline returns ordered timeline plus derived actions', async () => {
  const {
    buildPublicationCaptureRecord,
  } = require('../../../dist/publications/capture/publication-origin-capture.builders.js');
  const {
    buildPublicationNormalizedRecord,
  } = require('../../../dist/publications/capture/publication-origin-capture.builders.js');
  const {
    buildDerivedActionRecord,
    buildPublicationPipelineTimeline,
    buildCrmOriginReference,
    buildTriageOriginReference,
    buildCaptureEvidenceFetch,
  } = require('../../../dist/publications/pipeline/publication-origin-pipeline.builders.js');

  const capture = buildPublicationCaptureRecord({
    id: 10,
    sourceType: 'oab',
    sourceReference: 'OAB-123',
    occurredAt: '2026-05-26T10:00:00.000Z',
    evidenceText: 'Captura inicial',
    normalizedText: 'Captura inicial',
    oabNumber: '12345',
    personName: 'Carlos Lima',
  });
  const event = buildPublicationNormalizedRecord({
    id: 20,
    captureId: 10,
    publicationId: 30,
    correlationId: capture.correlationId,
    sourceType: capture.sourceType,
    sourceReference: capture.sourceReference,
    title: 'Publicação normalizada',
    summary: 'Resumo',
    fullText: 'Texto completo',
    eventAt: '2026-05-26T10:05:00.000Z',
  });
  const action = buildDerivedActionRecord({
    entityType: 'task',
    entityId: 40,
    correlationId: capture.correlationId,
    sourceType: capture.sourceType,
    sourceReference: capture.sourceReference,
    originStage: 'consolidado',
    status: 'pendente',
    title: 'Analisar publicação',
    summary: 'Ação operacional',
    url: '/tasks/40',
    createdAt: '2026-05-26T10:10:00.000Z',
  });

  const timeline = buildPublicationPipelineTimeline({
    capture,
    event,
    publication: {
      id: 30,
      summary: 'Publicação consolidada',
      publishedAt: '2026-05-26T10:06:00.000Z',
    },
    derivedActions: [action],
  });

  assert.equal(timeline.items.length, 4);
  assert.deepEqual(timeline.items.map((item) => item.entityType), ['capture', 'event', 'publication', 'task']);
  assert.equal(buildCrmOriginReference({ capture, event }).timelineUrl, `/publication-pipeline/${capture.correlationId}`);
  assert.equal(buildTriageOriginReference({ capture, event }).publicationId, 30);

  const evidence = buildCaptureEvidenceFetch({
    capture,
    event,
    publication: {
      id: 30,
      summary: 'Publicação consolidada',
      publishedAt: '2026-05-26T10:06:00.000Z',
    },
    derivedActions: [action],
  });

  assert.equal(evidence.capture.id, 10);
  assert.equal(evidence.derivedActions[0].entityType, 'task');
});
