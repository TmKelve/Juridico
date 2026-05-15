const test = require('node:test');
const assert = require('node:assert/strict');

test('buildDocumentPayload composes document data for the documentos screen', async () => {
  const { buildDocumentPayload } = require('../dist/documents.contract.js');

  const payload = buildDocumentPayload({
    id: 21,
    title: 'Petição inicial - Cliente Atlas',
    description: 'Documento principal para protocolo e análise jurídica.',
    status: 'aguardando_validacao',
    category: 'Peticao',
    version: 2,
    isLatestVersion: true,
    origin: 'upload',
    uploadedAt: new Date('2026-05-15T00:00:00.000Z'),
    responsible: 'advogado',
    requiredChecklist: true,
    pendingForAdvance: false,
    mimeType: 'application/pdf',
    previewUrl: 'data:application/pdf;base64,preview',
    processId: 7,
    process: {
      id: 7,
      title: 'Reclamatória Trabalhista Cliente Atlas',
      client: 'Cliente Atlas',
      phase: 'Inicial',
      clientRecord: { id: 3, name: 'Cliente Atlas', legalArea: 'Trabalhista' },
    },
  });

  assert.equal(payload.id, 21);
  assert.equal(payload.name, 'Petição inicial - Cliente Atlas');
  assert.equal(payload.processId, 7);
  assert.equal(payload.processLabel, '#7');
  assert.equal(payload.processTitle, 'Reclamatória Trabalhista Cliente Atlas');
  assert.equal(payload.client, 'Cliente Atlas');
  assert.equal(payload.category, 'Peticao');
  assert.equal(payload.status, 'aguardando_validacao');
  assert.equal(payload.version, 2);
  assert.equal(payload.isLatestVersion, true);
  assert.equal(payload.origin, 'upload');
  assert.equal(payload.uploadedAt, '2026-05-15');
  assert.equal(payload.owner, 'advogado');
  assert.equal(payload.requiredChecklist, true);
  assert.equal(payload.pendingForAdvance, false);
  assert.equal(payload.mimeType, 'application/pdf');
  assert.equal(payload.previewUrl, 'data:application/pdf;base64,preview');
});
