const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'ai', 'drafting', 'document-drafting.service.js');

test('DocumentDraftingService generates markdown draft with facts block', async () => {
  const { DocumentDraftingService } = require(modulePath);

  const service = new DocumentDraftingService();
  const result = await service.generate({
    templateId: 'peticao-inicial',
    processId: 12,
    documentTitle: 'Petição Inicial',
    payload: {
      processNumber: '0001234-55.2026.8.26.0001',
      clientName: 'Cliente Atlas',
    },
  });

  const decoded = Buffer.from(result.contentBase64, 'base64').toString('utf8');
  assert.equal(result.mimeType, 'text/markdown');
  assert.match(decoded, /# Petição Inicial/);
  assert.match(decoded, /Cliente Atlas/);
});
