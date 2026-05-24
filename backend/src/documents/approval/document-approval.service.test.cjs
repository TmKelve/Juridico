const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const approvalModulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'documents', 'approval');
const checklistModulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'documents', 'checklist');

test('normalizeDocumentApprovalInput requires reason when rejecting', async () => {
  const { normalizeDocumentApprovalInput } = require(approvalModulePath);

  assert.throws(
    () =>
      normalizeDocumentApprovalInput({
        documentId: 52,
        decision: 'rejected',
        actor: { source: 'user', email: 'adv@juridico.com' },
      }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      return true;
    },
  );
});

test('DocumentApprovalService blocks approval while checklist has missing items', async () => {
  const { DocumentApprovalService } = require(approvalModulePath);
  const { ProceduralDocumentChecklistService } = require(checklistModulePath);

  const service = new DocumentApprovalService(
    {
      async findById(documentId) {
        return {
          id: documentId,
          processId: 10,
          title: 'Petição inicial',
          status: 'aguardando_aprovacao',
          version: 1,
          isLatestVersion: true,
          metadata: {
            proceduralType: 'trabalhista',
            documentType: 'peticao_inicial',
            relatedDocumentTypes: ['peticao_inicial'],
          },
        };
      },
      async saveDecision() {
        throw new Error('should not persist when checklist is incomplete');
      },
    },
    new ProceduralDocumentChecklistService(),
  );

  await assert.rejects(
    () =>
      service.decide({
        documentId: 52,
        decision: 'approved',
        actor: { source: 'user', email: 'adv@juridico.com' },
      }),
    (error) => {
      assert.equal(error.code, 'DOCUMENT_CHECKLIST_INCOMPLETE');
      return true;
    },
  );
});

test('DocumentApprovalService persists rejection with reason', async () => {
  const { DocumentApprovalService } = require(approvalModulePath);
  const { ProceduralDocumentChecklistService } = require(checklistModulePath);

  let decisionSaved = null;

  const service = new DocumentApprovalService(
    {
      async findById(documentId) {
        return {
          id: documentId,
          processId: 10,
          title: 'Contrato social',
          status: 'aguardando_aprovacao',
          version: 2,
          isLatestVersion: true,
          metadata: {
            proceduralType: 'civel',
            documentType: 'contrato_social',
            relatedDocumentTypes: ['contrato_social', 'procuracao', 'documentos_pessoais'],
          },
        };
      },
      async saveDecision(input) {
        decisionSaved = input;
        return {
          documentId: input.documentId,
          status: input.status,
          decidedAt: '2026-05-22T12:00:00.000Z',
          decision: input.decision,
          reason: input.reason,
        };
      },
    },
    new ProceduralDocumentChecklistService(),
  );

  const result = await service.decide({
    documentId: 77,
    decision: 'rejected',
    reason: 'Arquivo ilegível',
    actor: { source: 'user', email: 'adv@juridico.com' },
  });

  assert.equal(decisionSaved.reason, 'Arquivo ilegível');
  assert.equal(result.status, 'rejeitado');
  assert.equal(result.reason, 'Arquivo ilegível');
});
