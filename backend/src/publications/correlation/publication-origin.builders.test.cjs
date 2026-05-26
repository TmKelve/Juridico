const test = require('node:test');
const assert = require('node:assert/strict');

test('computePublicationCorrelationId is deterministic for normalized inputs', async () => {
  const {
    computePublicationCorrelationId,
    createPublicationCorrelationSignature,
  } = require('../../../dist/publications/correlation/publication-origin.builders.js');

  const first = computePublicationCorrelationId({
    sourceType: 'Diario',
    sourceReference: ' DJE-123 ',
    processNumber: '0001234-55.2026.8.26.0001',
    personName: ' José da Silva ',
    occurredAt: '2026-05-26T12:00:00.000Z',
    evidenceText: 'Intimação para manifestação.',
  });

  const second = computePublicationCorrelationId({
    sourceType: 'diario',
    sourceReference: 'dje-123',
    processNumber: '00012345520268260001',
    personName: 'Jose da Silva',
    occurredAt: '2026-05-26T12:00:00.000Z',
    evidenceText: 'Intimação  para manifestação.',
  });

  assert.equal(first, second);
  assert.ok(first.startsWith('pub-origin:diario:00012345520268260001:'));
  assert.match(createPublicationCorrelationSignature({
    sourceType: 'diario',
    sourceReference: 'dje-123',
    processNumber: '00012345520268260001',
    occurredAt: '2026-05-26T12:00:00.000Z',
  }), /diario\|dje-123\|00012345520268260001/);
});

test('status builders prioritize derived actions and consolidation milestones', async () => {
  const {
    computePublicationPipelineStatus,
    computePublicationConsolidationStatus,
  } = require('../../../dist/publications/correlation/publication-origin.builders.js');

  assert.equal(computePublicationPipelineStatus({ taskId: 7, publicationId: 99 }), 'gerou_tarefa');
  assert.equal(computePublicationPipelineStatus({ crmLeadId: 7, eventId: 10 }), 'gerou_crm');
  assert.equal(computePublicationPipelineStatus({ eventId: 10 }), 'normalizado');
  assert.equal(computePublicationConsolidationStatus({ publicationId: 99 }), 'consolidado');
  assert.equal(computePublicationConsolidationStatus({ eventId: 10 }), 'aguardando_consolidacao');
  assert.equal(computePublicationConsolidationStatus({ failed: true }), 'falhou');
});
