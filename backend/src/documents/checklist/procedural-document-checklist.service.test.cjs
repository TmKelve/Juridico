const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const checklistModulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'documents', 'checklist');

test('ProceduralDocumentChecklistService returns required checklist by procedural type', async () => {
  const { ProceduralDocumentChecklistService } = require(checklistModulePath);

  const service = new ProceduralDocumentChecklistService();
  const result = service.evaluate({
    proceduralType: 'trabalhista',
    providedDocumentTypes: ['peticao_inicial', 'procuracao'],
  });

  assert.equal(result.proceduralType, 'trabalhista');
  assert.equal(result.missingItems.length, 1);
  assert.equal(result.missingItems[0].documentType, 'documentos_pessoais');
  assert.equal(result.complete, false);
});

test('ProceduralDocumentChecklistService normalizes provided document types before matching checklist items', async () => {
  const { ProceduralDocumentChecklistService } = require(checklistModulePath);

  const service = new ProceduralDocumentChecklistService();
  const result = service.evaluate({
    proceduralType: 'trabalhista',
    providedDocumentTypes: [' PETICAO_INICIAL ', 'PROCURACAO', ' documentos_pessoais '],
  });

  assert.equal(result.proceduralType, 'trabalhista');
  assert.equal(result.missingItems.length, 0);
  assert.equal(result.complete, true);
});
