const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const versioningModulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'documents', 'versioning');

test('DocumentVersioningService creates next version from current latest document', async () => {
  const { DocumentVersioningService } = require(versioningModulePath);

  const calls = {
    promote: null,
  };

  const service = new DocumentVersioningService({
    async findById(documentId) {
      return documentId === 32
        ? {
            id: 32,
            processId: 19,
            title: 'Contestação',
            description: 'Versão atual',
            status: 'aguardando_validacao',
            category: 'contestacao',
            version: 2,
            isLatestVersion: true,
            origin: 'interno',
            responsible: 'adv.responsavel',
            requiredChecklist: true,
            pendingForAdvance: false,
            mimeType: 'application/pdf',
            previewUrl: 'https://storage.local/v2.pdf',
            metadata: { proceduralType: 'trabalhista', documentType: 'contestacao' },
            storage: { storageKey: 'documents/19/contestacao-v2.pdf' },
          }
        : null;
    },
    async createNextVersion(input) {
      calls.promote = input;
      return {
        id: 33,
        processId: input.processId,
        title: input.title,
        description: input.description,
        status: input.status,
        category: input.category,
        version: input.version,
        isLatestVersion: true,
        origin: input.origin,
        responsible: input.responsible,
        requiredChecklist: input.requiredChecklist,
        pendingForAdvance: input.pendingForAdvance,
        mimeType: input.mimeType,
        previewUrl: input.previewUrl,
        metadata: input.metadata,
        storage: input.storage,
      };
    },
  });

  const result = await service.createVersion({
    documentId: 32,
    actor: { source: 'user', email: 'adv@juridico.com' },
    changes: {
      description: 'Versão revisada',
      status: 'aguardando_aprovacao',
      storage: { storageKey: 'documents/19/contestacao-v3.pdf' },
      metadata: { reviewNote: 'Ajuste de tese' },
    },
  });

  assert.equal(calls.promote.version, 3);
  assert.equal(calls.promote.metadata.proceduralType, 'trabalhista');
  assert.equal(calls.promote.metadata.reviewNote, 'Ajuste de tese');
  assert.equal(result.version, 3);
  assert.equal(result.storage.storageKey, 'documents/19/contestacao-v3.pdf');
});
