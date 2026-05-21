const test = require('node:test');
const assert = require('node:assert/strict');

test('FinanceEntryService creates a receivable entry with audit and idempotency replay', async () => {
  const { FinanceAuditService, InMemoryFinanceAuditRepository } = require('../../../dist/finance/shared/index.js');
  const { InMemoryFinanceEntryRepository } = require('../../../dist/finance/accounts/finance-entry.repository.js');
  const { InMemoryFinanceCategoryRepository } = require('../../../dist/finance/categories/finance-category.repository.js');
  const { FinanceEntryService } = require('../../../dist/finance/ledger/finance-entry.service.js');

  const repository = new InMemoryFinanceEntryRepository({
    clients: [{ id: 7 }],
    processes: [{ id: 14 }],
    users: [{ id: 3 }],
  });
  const categories = new InMemoryFinanceCategoryRepository([
    { code: 'honorarios', label: 'Honorarios', type: 'receivable', active: true, sortOrder: 1 },
  ]);
  const auditService = new FinanceAuditService(new InMemoryFinanceAuditRepository());
  const service = new FinanceEntryService({ repository, categories, auditService });

  const first = await service.createEntry({
    type: 'receivable',
    description: 'Parcela de honorarios',
    amountCents: 125000,
    currency: 'BRL',
    dueDate: '2026-06-10',
    clientId: 7,
    processId: 14,
    categoryCode: 'honorarios',
    responsibleUserId: 3,
    notes: 'Entrada inicial',
    idempotencyKey: 'entry-001',
  }, { source: 'user', userId: 3, role: 'FIN' });

  const replay = await service.createEntry({
    type: 'receivable',
    description: 'Parcela de honorarios',
    amountCents: 125000,
    currency: 'BRL',
    dueDate: '2026-06-10',
    clientId: 7,
    processId: 14,
    categoryCode: 'honorarios',
    responsibleUserId: 3,
    notes: 'Entrada inicial',
    idempotencyKey: 'entry-001',
  }, { source: 'user', userId: 3, role: 'FIN' });

  assert.equal(first.idempotency, 'created');
  assert.equal(first.entry.type, 'receivable');
  assert.equal(first.entry.status, 'open');
  assert.equal(first.entry.categoryLabel, 'Honorarios');
  assert.equal(replay.idempotency, 'replayed');
  assert.equal(replay.entry.id, first.entry.id);
});

test('FinanceEntryService performs manual settlement and rejects inconsistent transitions', async () => {
  const { FinanceAuditService, InMemoryFinanceAuditRepository } = require('../../../dist/finance/shared/index.js');
  const { InMemoryFinanceEntryRepository } = require('../../../dist/finance/accounts/finance-entry.repository.js');
  const { InMemoryFinanceCategoryRepository } = require('../../../dist/finance/categories/finance-category.repository.js');
  const { FinanceEntryService } = require('../../../dist/finance/ledger/finance-entry.service.js');

  const repository = new InMemoryFinanceEntryRepository();
  const categories = new InMemoryFinanceCategoryRepository([
    { code: 'custas', label: 'Custas', type: 'payable', active: true, sortOrder: 1 },
  ]);
  const auditService = new FinanceAuditService(new InMemoryFinanceAuditRepository());
  const service = new FinanceEntryService({ repository, categories, auditService });

  const created = await service.createEntry({
    type: 'payable',
    description: 'Custas recursais',
    amountCents: 50000,
    currency: 'BRL',
    dueDate: '2026-05-12',
    clientId: null,
    processId: null,
    categoryCode: 'custas',
    responsibleUserId: null,
    notes: null,
    idempotencyKey: 'entry-002',
  }, { source: 'user', userId: 11, role: 'FIN' });

  assert.equal(created.entry.status, 'overdue');

  const settled = await service.settleEntryManually({
    entryId: created.entry.id,
    settlementDate: '2026-05-13',
    paymentMethod: 'bank_transfer',
    notes: 'Pagamento efetuado',
    idempotencyKey: 'settlement-002',
  }, { source: 'user', userId: 11, role: 'FIN' });

  assert.equal(settled.entry.status, 'paid');
  assert.equal(settled.entry.settlementDate, '2026-05-13');
  assert.equal(settled.entry.paymentMethod, 'bank_transfer');
  assert.equal(settled.entry.settledAmountCents, 50000);

  await assert.rejects(
    () =>
      service.updateStatus({
        entryId: created.entry.id,
        status: 'open',
        settlementDate: null,
        paymentMethod: null,
        notes: null,
        idempotencyKey: 'reopen-002',
      }, { source: 'user', userId: 11, role: 'FIN' }),
    (error) => {
      assert.equal(error.code, 'FIN_STATUS_TRANSITION_INVALID');
      return true;
    },
  );
});

test('FinanceEntryService rejects invalid category typing and missing relation references', async () => {
  const { FinanceAuditService, InMemoryFinanceAuditRepository } = require('../../../dist/finance/shared/index.js');
  const { InMemoryFinanceEntryRepository } = require('../../../dist/finance/accounts/finance-entry.repository.js');
  const { InMemoryFinanceCategoryRepository } = require('../../../dist/finance/categories/finance-category.repository.js');
  const { FinanceEntryService } = require('../../../dist/finance/ledger/finance-entry.service.js');

  const repository = new InMemoryFinanceEntryRepository({
    clients: [{ id: 7 }],
    processes: [],
    users: [{ id: 3 }],
  });
  const categories = new InMemoryFinanceCategoryRepository([
    { code: 'custas', label: 'Custas', type: 'payable', active: true, sortOrder: 1 },
  ]);
  const auditService = new FinanceAuditService(new InMemoryFinanceAuditRepository());
  const service = new FinanceEntryService({ repository, categories, auditService });

  await assert.rejects(
    () =>
      service.createEntry({
        type: 'receivable',
        description: 'Honorarios',
        amountCents: 1000,
        currency: 'BRL',
        dueDate: '2026-06-10',
        clientId: 7,
        processId: 99,
        categoryCode: 'custas',
        responsibleUserId: 3,
        notes: null,
        idempotencyKey: 'entry-003',
      }, { source: 'user', userId: 3, role: 'FIN' }),
    (error) => {
      assert.equal(error.code, 'FIN_CATEGORY_NOT_FOUND');
      return true;
    },
  );

  await assert.rejects(
    () =>
      service.createEntry({
        type: 'payable',
        description: 'Custas sem processo valido',
        amountCents: 1000,
        currency: 'BRL',
        dueDate: '2026-06-10',
        clientId: 7,
        processId: 99,
        categoryCode: 'custas',
        responsibleUserId: 3,
        notes: null,
        idempotencyKey: 'entry-004',
      }, { source: 'user', userId: 3, role: 'FIN' }),
    (error) => {
      assert.equal(error.code, 'FIN_PROCESS_NOT_FOUND');
      return true;
    },
  );
});
