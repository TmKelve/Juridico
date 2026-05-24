const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const linksModulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'documents', 'links');
const auditModulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'documents', 'audit');

test('DocumentLinksService binds multiple entities and records audit trail', async () => {
  const { DocumentLinksService, InMemoryDocumentLinksRepository } = require(linksModulePath);
  const { DocumentAuditService, InMemoryDocumentAuditSink } = require(auditModulePath);

  const repository = new InMemoryDocumentLinksRepository();
  repository.seedDocument({ id: 51, processId: 19 });
  repository.seedTarget({ entityType: 'process', entityId: 19 });
  repository.seedTarget({ entityType: 'deadline', entityId: 88 });

  const service = new DocumentLinksService(repository, {
    auditService: new DocumentAuditService(new InMemoryDocumentAuditSink()),
  });

  const result = await service.bindEntities({
    documentId: 51,
    processId: 19,
    deadlineId: 88,
    actor: { source: 'user', email: 'adv@juridico.com' },
    occurredAt: '2026-05-22T12:00:00.000Z',
  });

  assert.equal(result.documentId, 51);
  assert.equal(result.links.length, 2);
  assert.equal(result.auditEvents.length, 2);
  assert.equal(result.links[0].boundBy.email, 'adv@juridico.com');
});

test('DocumentLinksService rejects missing target entities', async () => {
  const { DocumentLinksService, InMemoryDocumentLinksRepository } = require(linksModulePath);

  const repository = new InMemoryDocumentLinksRepository();
  repository.seedDocument({ id: 52, processId: 19 });
  repository.seedTarget({ entityType: 'process', entityId: 19 });

  const service = new DocumentLinksService(repository);

  await assert.rejects(
    () =>
      service.bindEntities({
        documentId: 52,
        processId: 19,
        triageItemId: 501,
        actor: { source: 'system' },
      }),
    (error) => {
      assert.equal(error.code, 'DOCUMENT_LINK_NOT_FOUND');
      return true;
    },
  );
});
