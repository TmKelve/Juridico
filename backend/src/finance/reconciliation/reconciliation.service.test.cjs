const test = require('node:test');
const assert = require('node:assert/strict');

test('FinanceReconciliationService classifies matched, partial and unmatched bank lines and records audit', async () => {
  const {
    FinanceReconciliationService,
    InMemoryFinanceReconciliationRepository,
  } = require('../../../dist/finance/reconciliation/reconciliation.service.js');
  const { InMemoryFinanceAuditRepository, FinanceAuditService } = require('../../../dist/finance/shared/audit.js');

  const repository = new InMemoryFinanceReconciliationRepository([
    {
      id: 11,
      type: 'receivable',
      status: 'open',
      amountCents: 15000,
      settledAmountCents: 0,
      dueDate: '2026-05-18',
      description: 'Honorarios maio ACME',
      referenceNumber: 'INV-001',
      externalRef: 'bank-acme-1',
    },
    {
      id: 12,
      type: 'receivable',
      status: 'partially_paid',
      amountCents: 20000,
      settledAmountCents: 5000,
      dueDate: '2026-05-17',
      description: 'Parcela consultoria abril',
      referenceNumber: 'INV-002',
      externalRef: null,
    },
  ]);

  const auditService = new FinanceAuditService(new InMemoryFinanceAuditRepository());
  const service = new FinanceReconciliationService({ repository, auditService });

  const result = await service.run({
    referenceDate: '2026-05-21',
    lines: [
      {
        externalId: 'line-1',
        occurredAt: '2026-05-21T09:00:00.000Z',
        amountCents: 15000,
        description: 'Credito INV-001 ACME',
      },
      {
        externalId: 'line-2',
        occurredAt: '2026-05-21T09:05:00.000Z',
        amountCents: 7000,
        description: 'PIX parcial consultoria',
      },
      {
        externalId: 'line-3',
        occurredAt: '2026-05-21T09:10:00.000Z',
        amountCents: 9900,
        description: 'Transferencia sem referencia',
      },
    ],
    actor: { source: 'user', userId: 7, email: 'financeiro@juridico.com', role: 'FIN' },
    createdBy: 'financeiro@juridico.com',
    idempotencyKey: 'recon-run-001',
  });

  assert.equal(result.run.status, 'partial');
  assert.equal(result.run.matchedLines, 1);
  assert.equal(result.run.unmatchedLines, 1);
  assert.equal(result.matches.length, 3);
  assert.equal(result.matches[0].status, 'matched');
  assert.equal(result.matches[0].entryId, 11);
  assert.equal(result.matches[1].status, 'partial');
  assert.equal(result.matches[1].entryId, 12);
  assert.equal(result.matches[2].status, 'unmatched');
  assert.equal(result.auditEvent.scope, 'finance.reconciliation.run');

  const replay = await service.run({
    referenceDate: '2026-05-21',
    lines: [
      {
        externalId: 'line-1',
        occurredAt: '2026-05-21T09:00:00.000Z',
        amountCents: 15000,
        description: 'Credito INV-001 ACME',
      },
      {
        externalId: 'line-2',
        occurredAt: '2026-05-21T09:05:00.000Z',
        amountCents: 7000,
        description: 'PIX parcial consultoria',
      },
      {
        externalId: 'line-3',
        occurredAt: '2026-05-21T09:10:00.000Z',
        amountCents: 9900,
        description: 'Transferencia sem referencia',
      },
    ],
    actor: { source: 'user', userId: 7, email: 'financeiro@juridico.com', role: 'FIN' },
    createdBy: 'financeiro@juridico.com',
    idempotencyKey: 'recon-run-001',
  });

  assert.equal(replay.idempotency.mode, 'replayed');
  assert.equal(replay.run.id, result.run.id);
});

test('FinanceReconciliationService rejects duplicated external lines', async () => {
  const {
    FinanceReconciliationService,
    InMemoryFinanceReconciliationRepository,
  } = require('../../../dist/finance/reconciliation/reconciliation.service.js');
  const { InMemoryFinanceAuditRepository, FinanceAuditService } = require('../../../dist/finance/shared/audit.js');

  const service = new FinanceReconciliationService({
    repository: new InMemoryFinanceReconciliationRepository([]),
    auditService: new FinanceAuditService(new InMemoryFinanceAuditRepository()),
  });

  await assert.rejects(
    () =>
      service.run({
        referenceDate: '2026-05-21',
        lines: [
          {
            externalId: 'dup-1',
            occurredAt: '2026-05-21T09:00:00.000Z',
            amountCents: 1000,
            description: 'A',
          },
          {
            externalId: 'dup-1',
            occurredAt: '2026-05-21T09:05:00.000Z',
            amountCents: 1000,
            description: 'B',
          },
        ],
        actor: { source: 'system' },
      }),
    (error) => {
      assert.equal(error.code, 'FIN_RECONCILIATION_INVALID');
      return true;
    },
  );
});
