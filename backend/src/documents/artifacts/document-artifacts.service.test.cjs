const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const artifactsModulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'documents', 'artifacts');
const auditModulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'documents', 'audit');

test('DocumentArtifactsService generates, stores and persists artifact as document', async () => {
  const { DocumentArtifactsService, InMemoryDocumentArtifactsRepository } = require(artifactsModulePath);
  const { DocumentAuditService, InMemoryDocumentAuditSink } = require(auditModulePath);

  const repository = new InMemoryDocumentArtifactsRepository();
  repository.seedProcess(17);

  const service = new DocumentArtifactsService(
    {
      async generate(input) {
        return {
          fileName: `${input.documentTitle}.pdf`,
          mimeType: 'application/pdf',
          contentBase64: 'Z2VyYWRv',
          metadata: { templateVersion: 'v1' },
        };
      },
    },
    {
      async store(input) {
        return {
          storageKey: `documents/${input.processId}/artifacts/${input.fileName}`,
          mimeType: input.mimeType,
          sizeInBytes: 4096,
          checksum: 'sha256:artifact',
          previewUrl: `https://storage.local/${input.fileName}`,
        };
      },
    },
    repository,
    {
      auditService: new DocumentAuditService(new InMemoryDocumentAuditSink()),
    },
  );

  const result = await service.generate({
    templateId: 'peticao-template',
    processId: 17,
    documentTitle: 'Petição Inicial',
    payload: { processNumber: '0001234-55.2026.8.26.0001' },
    persistAsDocument: true,
    actor: { source: 'user', email: 'adv@juridico.com' },
    occurredAt: '2026-05-22T13:00:00.000Z',
  });

  assert.equal(result.documentId, 1000);
  assert.equal(result.storageKey, 'documents/17/artifacts/Petição Inicial.pdf');
  assert.equal(result.checksum, 'sha256:artifact');
  assert.equal(result.auditEvent?.eventType, 'document_artifact_generated');
});

test('DocumentArtifactsService supports idempotent replay through injected port', async () => {
  const { DocumentArtifactsService, InMemoryDocumentArtifactsRepository } = require(artifactsModulePath);

  const repository = new InMemoryDocumentArtifactsRepository();
  repository.seedProcess(18);

  let executions = 0;
  const service = new DocumentArtifactsService(
    {
      async generate(input) {
        executions += 1;
        return {
          fileName: `${input.documentTitle}.pdf`,
          mimeType: 'application/pdf',
          contentBase64: 'Z2VyYWRv',
        };
      },
    },
    {
      async store(input) {
        return {
          storageKey: `documents/${input.processId}/artifacts/${input.fileName}`,
          mimeType: input.mimeType,
          sizeInBytes: 1024,
          checksum: 'sha256:artifact-2',
        };
      },
    },
    repository,
    {
      idempotencyService: {
        async runIdempotent(input) {
          const data = await input.execute();
          return { mode: 'replayed', data, idempotencyKey: input.key ?? null };
        },
      },
    },
  );

  const result = await service.generate({
    templateId: 'contrato-template',
    processId: 18,
    documentTitle: 'Contrato',
    payload: { client: 'ACME' },
    persistAsDocument: false,
    actor: { source: 'system' },
    idempotencyKey: 'artifact-18',
  });

  assert.equal(executions, 1);
  assert.equal(result.idempotent, true);
  assert.equal(result.documentId, null);
});
