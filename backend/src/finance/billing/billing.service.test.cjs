const test = require('node:test');
const assert = require('node:assert/strict');

test('FinanceBillingService generates a mock PIX charge with audit trail and idempotent replay', async () => {
  const {
    FinanceBillingService,
    InMemoryFinanceBillingRepository,
  } = require('../../../dist/finance/billing/billing.service.js');
  const { MockFinancePaymentProvider } = require('../../../dist/finance/payment-links/mock-payment-provider.js');
  const { InMemoryFinanceAuditRepository, FinanceAuditService } = require('../../../dist/finance/shared/audit.js');

  const repository = new InMemoryFinanceBillingRepository({
    entries: [
      {
        id: 41,
        type: 'receivable',
        status: 'open',
        description: 'Honorarios fase recursal',
        amountCents: 185000,
        settledAmountCents: 0,
        dueDate: new Date('2026-06-10T00:00:00.000Z'),
        settlementDate: null,
        paymentMethod: null,
        currency: 'BRL',
        clientId: 11,
        processId: 7,
        categoryCode: 'HON',
        category: { code: 'HON', label: 'Honorarios' },
        responsibleUserId: 5,
        notes: 'Emitir cobranca automaticamente.',
        createdAt: new Date('2026-05-21T10:00:00.000Z'),
        updatedAt: new Date('2026-05-21T10:00:00.000Z'),
        charges: [],
      },
    ],
  });

  const service = new FinanceBillingService({
    repository,
    paymentProvider: new MockFinancePaymentProvider(),
    auditService: new FinanceAuditService(new InMemoryFinanceAuditRepository()),
    now: () => new Date('2026-05-21T13:00:00.000Z'),
  });

  const input = {
    entryId: 41,
    method: 'pix',
    expiresAt: '2026-06-10T23:59:59.000Z',
    recipientEmail: 'financeiro@cliente.com',
    recipientPhone: '5511999999999',
    idempotencyKey: 'charge:41:pix:2026-06',
    actor: { source: 'user', userId: 9, email: 'fin@lexora.local', role: 'FIN' },
  };

  const first = await service.generate(input);
  const second = await service.generate(input);

  assert.equal(first.idempotency, 'created');
  assert.equal(first.charge.method, 'pix');
  assert.equal(first.charge.status, 'pending');
  assert.equal(first.charge.provider, 'mock');
  assert.match(first.charge.externalId, /^mock_charge_/);
  assert.match(first.charge.pixCode, /^PIX\|/);
  assert.match(first.charge.paymentUrl, /^https:\/\/mock\.lexora\.local\/pay\//);
  assert.equal(first.entry.chargeStatus, 'pending');
  assert.equal(first.entry.billingMethod, 'pix');
  assert.equal(first.auditEvent.scope, 'finance.billing.generate');
  assert.equal(first.auditEvent.entityType, 'charge');
  assert.equal(first.auditEvent.status, 'success');
  assert.equal(repository.listChargeRows().length, 1);
  assert.equal(repository.listChargeEventRows().length, 1);

  assert.equal(second.idempotency, 'replayed');
  assert.equal(second.charge.id, first.charge.id);
  assert.equal(repository.listChargeRows().length, 1);
  assert.equal(repository.listChargeEventRows().length, 1);
});
