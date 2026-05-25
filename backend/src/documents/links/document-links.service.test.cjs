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

test('createPrismaDocumentLinksRepository rehydrates and persists links through audit sidecar events', async () => {
  const { createPrismaDocumentLinksRepository } = require(linksModulePath);

  const createdEvents = [];
  const repository = createPrismaDocumentLinksRepository({
    document: {
      async findUnique({ where }) {
        return where.id === 53 ? { id: 53, processId: 19 } : null;
      },
    },
    process: {
      async findUnique({ where }) {
        return where.id === 19 ? { id: 19 } : null;
      },
    },
    auditEvent: {
      async findMany() {
        return [
          {
            action: 'document.link.bindEntities',
            details: {
              links: [
                { entityType: 'process', entityId: 19, boundAt: '2026-05-24T10:00:00.000Z', boundBy: { source: 'user', email: 'old@juridico.local' } },
              ],
            },
          },
          {
            action: 'document.link.bindEntities',
            details: {
              links: [
                { entityType: 'process', entityId: 19, boundAt: '2026-05-24T11:00:00.000Z', boundBy: { source: 'user', email: 'adv@juridico.local' } },
                { entityType: 'deadline', entityId: 88, boundAt: '2026-05-24T11:00:00.000Z', boundBy: { source: 'user', email: 'adv@juridico.local' } },
              ],
            },
          },
        ];
      },
      async create({ data }) {
        createdEvents.push(data);
        return data;
      },
    },
  });

  const links = await repository.listLinks(53);
  assert.equal(links.length, 2);
  assert.equal(links[1].entityType, 'deadline');
  assert.equal(links[1].boundBy.email, 'adv@juridico.local');

  await repository.saveLinks({
    documentId: 53,
    links,
  });

  assert.equal(createdEvents.length, 1);
  assert.equal(createdEvents[0].action, 'document.link.bindEntities');
  assert.equal(createdEvents[0].entityId, 53);
  assert.equal(createdEvents[0].details.links.length, 2);
});
