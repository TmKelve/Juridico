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

test('createPrismaDocumentArtifactsRepository persists document rows without metadata or storage columns', async () => {
  const { createPrismaDocumentArtifactsRepository } = require(artifactsModulePath);

  const createdRows = [];
  const repository = createPrismaDocumentArtifactsRepository({
    process: {
      async findUnique({ where }) {
        return where.id === 19 ? { id: 19 } : null;
      },
    },
    auditEvent: {
      async create({ data }) {
        return {
          ...data,
          occurredAt: data.occurredAt,
          details: data.details,
        };
      },
    },
    document: {
      async create({ data }) {
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
    createdBy: 'adv@juridico.local',
    metadata: { templateId: 'peticao-template' },
    storage: {
      storageKey: 'documents/19/artifacts/peticao-gerada.pdf',
      mimeType: 'application/pdf',
      sizeInBytes: 2048,
      checksum: 'sha256:abc',
      previewUrl: null,
    },
  });

  assert.equal(createdRows.length, 1);
  assert.equal(createdRows[0].title, 'Petição Gerada');
  assert.equal(createdRows[0].mimeType, 'application/pdf');
  assert.equal('metadata' in createdRows[0], false);
  assert.equal('storage' in createdRows[0], false);
  assert.equal(document.id, 88);
  assert.deepEqual(document.metadata, { templateId: 'peticao-template' });
  assert.equal(document.storage.storageKey, 'documents/19/artifacts/peticao-gerada.pdf');
});
