const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'dist',
  'documents',
  'runtime',
  'document-sidecar-bridges.js',
);

test('audit-backed links repository rehydrates latest link snapshot from sidecar events', async () => {
  const { createAuditBackedDocumentLinksRepository } = require(modulePath);

  const repository = createAuditBackedDocumentLinksRepository({
    findDocumentById: async (documentId) => (
      documentId === 7 ? { id: 7, processId: 19 } : null
    ),
    listAuditTrail: async () => ([
      {
        action: 'document.link.bindEntities',
        details: {
          links: [
            { entityType: 'process', entityId: 19, boundAt: '2026-05-24T10:00:00.000Z', boundBy: { source: 'user', email: 'old@lexora.local' } },
          ],
        },
      },
      {
        action: 'document.link.bindEntities',
        details: {
          links: [
            { entityType: 'process', entityId: 19, boundAt: '2026-05-24T11:00:00.000Z', boundBy: { source: 'user', email: 'adv@lexora.local' } },
            { entityType: 'triage_item', entityId: 71, boundAt: '2026-05-24T11:00:00.000Z', boundBy: { source: 'user', email: 'adv@lexora.local' } },
          ],
        },
      },
    ]),
    entityLookup: async (entityType, entityId) => entityType === 'process' || entityId === 71,
  });

  const links = await repository.listLinks(7);
  assert.equal(links.length, 2);
  assert.equal(links[1].entityType, 'triage_item');
  assert.equal(links[1].boundBy.email, 'adv@lexora.local');
});

test('audit-backed artifacts repository persists generated documents without metadata columns', async () => {
  const { createAuditBackedDocumentArtifactsRepository } = require(modulePath);

  const createdRows = [];
  const repository = createAuditBackedDocumentArtifactsRepository({
    assertProcessExists: async (processId) => processId === 19,
    createDocumentRow: async (data) => {
      createdRows.push(data);
      return {
        id: 88,
        processId: data.processId,
        title: data.title,
        version: 1,
        isLatestVersion: true,
        status: data.status,
        category: data.category,
      };
    },
  });

  const document = await repository.createDocument({
    processId: 19,
    title: 'Petição Gerada',
    category: 'Peticao',
    status: 'gerado',
    origin: 'interno',
    mimeType: 'application/pdf',
    previewUrl: null,
    createdBy: 'adv',
    metadata: { templateId: '1' },
    storage: { storageKey: 'memory://artifact.pdf', mimeType: 'application/pdf', sizeInBytes: 10, checksum: 'abc', previewUrl: null },
  });

  assert.equal(createdRows[0].title, 'Petição Gerada');
  assert.equal(createdRows[0].mimeType, 'application/pdf');
  assert.equal(document.id, 88);
  assert.equal(document.storage.storageKey, 'memory://artifact.pdf');
  assert.deepEqual(document.metadata, { templateId: '1' });
});
