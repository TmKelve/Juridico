const test = require('node:test');
const assert = require('node:assert/strict');

test('FinanceInstallmentPlanService creates a receivable plan and generates installments', async () => {
  const { InMemoryFinanceEntryRepository } = require('../../../dist/finance/accounts/finance-entry.repository.js');
  const { InMemoryFinanceCategoryRepository } = require('../../../dist/finance/categories/finance-category.repository.js');
  const { FinanceAuditService, InMemoryFinanceAuditRepository } = require('../../../dist/finance/shared/audit.js');
  const { FinanceInstallmentPlanService, InMemoryFinanceInstallmentPlanRepository } = require('../../../dist/finance/installments/finance-installment-plan.service.js');

  const service = new FinanceInstallmentPlanService({
    plans: new InMemoryFinanceInstallmentPlanRepository(),
    entries: new InMemoryFinanceEntryRepository({
      clients: [{ id: 7 }],
      processes: [{ id: 14 }],
      users: [{ id: 3 }],
    }),
    categories: new InMemoryFinanceCategoryRepository([{ code: 'mensalidade', label: 'Mensalidade', type: 'receivable', active: true, sortOrder: 30 }]),
    auditService: new FinanceAuditService(new InMemoryFinanceAuditRepository()),
    now: () => new Date('2026-05-21T10:00:00.000Z'),
  });

  const result = await service.createPlan({
    description: 'Acordo parcelado cliente Prisma',
    clientId: 7,
    processId: 14,
    categoryCode: 'mensalidade',
    installmentCount: 3,
    installmentAmountCents: 50000,
    dueDay: 30,
    firstDueDate: '2026-05-30',
    responsibleUserId: 3,
    notes: 'Parcelamento mensal',
    idempotencyKey: 'plan-1',
  }, { source: 'user', userId: 3, email: 'financeiro@juridico.com', role: 'FIN' });

  assert.equal(result.plan.installmentCount, 3);
  assert.equal(result.plan.totalAmountCents, 150000);
  assert.equal(result.entries.length, 3);
  assert.equal(result.entries[0].installmentNumber, 1);
  assert.equal(result.entries[1].dueDate.toISOString().slice(0, 10), '2026-06-30');
  assert.equal(result.entries[2].dueDate.toISOString().slice(0, 10), '2026-07-30');
});
