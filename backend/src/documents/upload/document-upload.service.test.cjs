const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const uploadModulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'documents', 'upload');

test('normalizeDocumentUploadInput requires metadata object and trims fields', async () => {
  const { normalizeDocumentUploadInput } = require(uploadModulePath);

  const normalized = normalizeDocumentUploadInput({
    processId: '91',
    title: '  Contrato social  ',
    actor: { source: 'user', email: 'adv@juridico.com' },
    file: {
      fileName: 'contrato.pdf',
      contentBase64: 'ZmlsZS1jb250ZW50',
      mimeType: 'application/pdf',
      sizeInBytes: 512,
    },
    metadata: {
      proceduralType: 'civel',
      documentType: 'contrato_social',
      tags: [' societario ', '', 'cliente'],
      fileName: 'contrato.pdf',
    },
  });

  assert.equal(normalized.processId, 91);
  assert.equal(normalized.title, 'Contrato social');
  assert.deepEqual(normalized.metadata.tags, ['societario', 'cliente']);
  assert.equal(normalized.metadata.proceduralType, 'civel');
});

test('DocumentUploadService stores file through adapter and persists metadata-oriented document', async () => {
  const { DocumentUploadService } = require(uploadModulePath);

  const calls = {
    store: null,
    create: null,
  };

  const service = new DocumentUploadService(
    {
      async store(input) {
        calls.store = input;
        return {
          storageKey: 'documents/91/contrato-social.pdf',
          mimeType: input.mimeType,
          sizeInBytes: input.sizeInBytes,
          checksum: 'sha256:abc123',
          previewUrl: 'https://storage.local/documents/91/contrato-social.pdf',
        };
      },
    },
    {
      async assertProcessExists(processId) {
        return { id: processId, proceduralType: 'civel' };
      },
      async createDocument(input) {
        calls.create = input;
        return {
          id: 401,
          processId: input.processId,
          title: input.title,
          status: input.status,
          category: input.category,
          version: 1,
          isLatestVersion: true,
          mimeType: input.mimeType,
          previewUrl: input.previewUrl,
          metadata: input.metadata,
          storage: input.storage,
        };
      },
    },
  );

  const result = await service.upload({
    processId: 91,
    title: 'Contrato social',
    actor: { source: 'user', email: 'adv@juridico.com' },
    file: {
      fileName: 'contrato-social.pdf',
      contentBase64: 'ZmlsZS1jb250ZW50',
      mimeType: 'application/pdf',
      sizeInBytes: 2048,
    },
    metadata: {
      proceduralType: 'civel',
      documentType: 'contrato_social',
      checklistCode: 'peticao-inicial',
      tags: ['cliente'],
    },
  });

  assert.equal(calls.store.fileName, 'contrato-social.pdf');
  assert.equal(calls.create.storage.storageKey, 'documents/91/contrato-social.pdf');
  assert.equal(calls.create.category, 'contrato_social');
  assert.equal(result.document.id, 401);
  assert.equal(result.document.storage.checksum, 'sha256:abc123');
});
