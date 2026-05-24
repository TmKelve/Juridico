const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const auditModulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'documents', 'audit');

test('DocumentAuditService normalizes and records document events', async () => {
  const { DocumentAuditService, InMemoryDocumentAuditSink } = require(auditModulePath);

  const service = new DocumentAuditService(new InMemoryDocumentAuditSink());
  const recorded = await service.record({
    eventType: 'document_linked',
    entityType: 'document_link',
    entityId: 41,
    documentId: 21,
    processId: 9,
    status: 'success',
    summary: 'Documento vinculado ao prazo',
    details: { deadlineId: 41 },
    actor: { source: 'user', email: 'adv@juridico.com' },
    occurredAt: '2026-05-22T12:00:00.000Z',
  });

  assert.equal(recorded.scope, 'documents');
  assert.equal(recorded.documentId, 21);
  assert.equal(recorded.entityType, 'document_link');
});

test('InMemoryDocumentAuditSink lists latest events first and filters by document', async () => {
  const { DocumentAuditService, InMemoryDocumentAuditSink } = require(auditModulePath);

  const service = new DocumentAuditService(new InMemoryDocumentAuditSink());

  await service.record({
    eventType: 'document_linked',
    entityType: 'document_link',
    entityId: 5,
    documentId: 99,
    processId: 7,
    status: 'success',
    summary: 'Primeiro',
    actor: { source: 'system' },
    occurredAt: '2026-05-22T11:00:00.000Z',
  });

  await service.record({
    eventType: 'document_artifact_generated',
    entityType: 'document_artifact',
    entityId: 6,
    documentId: 99,
    processId: 7,
    status: 'success',
    summary: 'Segundo',
    actor: { source: 'system' },
    occurredAt: '2026-05-22T12:00:00.000Z',
  });

  const items = await service.query({ documentId: 99 });
  assert.equal(items.length, 2);
  assert.equal(items[0].summary, 'Segundo');
  assert.equal(items[1].summary, 'Primeiro');
});
