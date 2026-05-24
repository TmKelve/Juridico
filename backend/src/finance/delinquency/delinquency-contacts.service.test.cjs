const test = require('node:test');
const assert = require('node:assert/strict');

test('FinanceDelinquencyContactsService groups overdue receivables by client and process', async () => {
  const { FinanceDelinquencyContactsService } = require('../../../dist/finance/delinquency/delinquency-contacts.service.js');

  const service = new FinanceDelinquencyContactsService();
  const items = service.build([
    {
      id: 1,
      type: 'receivable',
      status: 'overdue',
      description: 'Parcela 1/3',
      amountCents: 50000,
      settledAmountCents: 0,
      dueDate: new Date('2026-04-30T00:00:00.000Z'),
      settlementDate: null,
      paymentMethod: null,
      currency: 'BRL',
      clientId: 7,
      clientRecord: { id: 7, name: 'Cliente Prisma', email: 'prisma@cliente.local', phone: '+5511999991234' },
      processId: 14,
      process: { id: 14, title: 'Execução Contratual Cliente Prisma', processNumber: '70099887720264030015' },
      installmentPlanId: 9,
      installmentNumber: 1,
      categoryCode: 'mensalidade',
      category: { code: 'mensalidade', label: 'Mensalidade' },
      responsibleUserId: 3,
      notes: null,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
      charges: [{ status: 'pending', method: 'pix' }],
    },
    {
      id: 2,
      type: 'receivable',
      status: 'overdue',
      description: 'Parcela 2/3',
      amountCents: 50000,
      settledAmountCents: 10000,
      dueDate: new Date('2026-05-30T00:00:00.000Z'),
      settlementDate: null,
      paymentMethod: null,
      currency: 'BRL',
      clientId: 7,
      clientRecord: { id: 7, name: 'Cliente Prisma', email: 'prisma@cliente.local', phone: '+5511999991234' },
      processId: 14,
      process: { id: 14, title: 'Execução Contratual Cliente Prisma', processNumber: '70099887720264030015' },
      installmentPlanId: 9,
      installmentNumber: 2,
      categoryCode: 'mensalidade',
      category: { code: 'mensalidade', label: 'Mensalidade' },
      responsibleUserId: 3,
      notes: null,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      charges: [],
    },
  ], [
    {
      entryId: 1,
      channel: 'email',
      nextRunAt: '2026-05-22T12:00:00.000Z',
      status: 'sent',
      attempts: [{ channel: 'email', status: 'sent', sentAt: '2026-05-21T10:00:00.000Z' }],
    },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].clientName, 'Cliente Prisma');
  assert.equal(items[0].overdueEntriesCount, 2);
  assert.equal(items[0].overdueInstallmentsCount, 2);
  assert.equal(items[0].overdueAmountCents, 90000);
  assert.equal(items[0].entries.length, 2);
  assert.equal(items[0].lastCollectionChannel, 'email');
  assert.equal(items[0].lastCollectionOutcome, 'sent');
});
