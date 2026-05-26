const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const artifactsModulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'documents', 'artifacts');
const adapterModulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'ai', 'drafting', 'template-document-generator.adapter.js');

test('AiTemplateDocumentGeneratorAdapter plugs into DocumentArtifactsService', async () => {
  const { DocumentArtifactsService, InMemoryDocumentArtifactsRepository } = require(artifactsModulePath);
  const { AiTemplateDocumentGeneratorAdapter } = require(adapterModulePath);

  const repository = new InMemoryDocumentArtifactsRepository();
  repository.seedProcess(33);

  const service = new DocumentArtifactsService(
    new AiTemplateDocumentGeneratorAdapter(),
    {
      async store(input) {
        return {
          storageKey: `documents/${input.processId}/artifacts/${input.fileName}`,
          mimeType: input.mimeType,
          sizeInBytes: 512,
          checksum: 'sha256:ai-draft',
          previewUrl: null,
        };
      },
    },
    repository,
  );

  const result = await service.generate({
    templateId: 'peticao-template',
    processId: 33,
    documentTitle: 'Rascunho Teste',
    payload: { clientName: 'Cliente Boreal' },
    persistAsDocument: false,
    actor: { source: 'user', email: 'adv@juridico.com' },
  });

  assert.equal(result.documentId, null);
  assert.match(result.storageKey, /Rascunho Teste\.md/);
});
