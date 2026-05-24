const test = require('node:test');
const assert = require('node:assert/strict');

test('FinanceWebhookService settles entry automatically when mock provider confirms payment', async () => {
  const {
    FinanceBillingService,
    InMemoryFinanceBillingRepository,
  } = require('../../../dist/finance/billing/billing.service.js');
  const { FinanceWebhookService } = require('../../../dist/finance/webhooks/finance-webhook.service.js');
  const { MockFinancePaymentProvider } = require('../../../dist/finance/payment-links/mock-payment-provider.js');
  const { InMemoryFinanceAuditRepository, FinanceAuditService } = require('../../../dist/finance/shared/audit.js');

  const repository = new InMemoryFinanceBillingRepository({
    entries: [
      {
        id: 88,
        type: 'receivable',
        status: 'open',
        description: 'Parcela acordo cliente Delta',
        amountCents: 99000,
        settledAmountCents: 0,
        dueDate: new Date('2026-05-30T00:00:00.000Z'),
        settlementDate: null,
        paymentMethod: null,
        currency: 'BRL',
        clientId: 18,
        processId: 19,
        categoryCode: 'ACORDO',
        category: { code: 'ACORDO', label: 'Acordo' },
        responsibleUserId: 5,
        notes: null,
        createdAt: new Date('2026-05-21T10:00:00.000Z'),
        updatedAt: new Date('2026-05-21T10:00:00.000Z'),
        charges: [],
      },
    ],
  });
  const auditService = new FinanceAuditService(new InMemoryFinanceAuditRepository());
  const paymentProvider = new MockFinancePaymentProvider();

  const billingService = new FinanceBillingService({
    repository,
    paymentProvider,
    auditService,
    now: () => new Date('2026-05-21T13:00:00.000Z'),
  });

  const generated = await billingService.generate({
    entryId: 88,
    method: 'payment_link',
    expiresAt: '2026-05-30T23:59:59.000Z',
    recipientEmail: 'cliente@delta.com',
    recipientPhone: null,
    idempotencyKey: 'charge:88:link',
    actor: { source: 'user', userId: 4, email: 'cobranca@lexora.local', role: 'FIN' },
  });

  const service = new FinanceWebhookService({
    repository,
    paymentProvider,
    auditService,
    now: () => new Date('2026-05-22T15:00:00.000Z'),
  });

  const input = {
    provider: 'mock',
    providerEventId: 'evt_mock_paid_88',
    chargeExternalId: generated.charge.externalId,
    status: 'paid',
    paidAt: '2026-05-22T14:15:00.000Z',
    amountPaidCents: 99000,
    idempotencyKey: 'evt_mock_paid_88',
    actor: { source: 'api', email: 'webhook@mock.local', role: 'system' },
  };

  const first = await service.handle(input);
  const second = await service.handle(input);

  assert.equal(first.charge.status, 'paid');
  assert.equal(first.entry.status, 'paid');
  assert.equal(first.entry.paymentMethod, 'link');
  assert.equal(first.entry.settlementDate, '2026-05-22');
  assert.equal(first.auditEvent.scope, 'finance.billing.webhookUpdate');
  assert.equal(first.auditEvent.status, 'success');
  assert.equal(first.auditEvent.entityId, String(first.charge.id));
  assert.equal(repository.listChargeEventRows().length, 2);
  assert.equal(repository.listChargeEventRows()[1].providerEventId, 'evt_mock_paid_88');

  assert.equal(second.idempotency, 'replayed');
  assert.equal(second.charge.id, first.charge.id);
  assert.equal(repository.listChargeEventRows().length, 2);
});

test('FinanceWebhookService trusts canonical webhook input and does not re-normalize provider payload', async () => {
  const {
    FinanceBillingService,
    InMemoryFinanceBillingRepository,
  } = require('../../../dist/finance/billing/billing.service.js');
  const { FinanceWebhookService } = require('../../../dist/finance/webhooks/finance-webhook.service.js');
  const { InMemoryFinanceAuditRepository, FinanceAuditService } = require('../../../dist/finance/shared/audit.js');

  const repository = new InMemoryFinanceBillingRepository({
    entries: [
      {
        id: 91,
        type: 'receivable',
        status: 'open',
        description: 'Parcela Asaas cliente Orion',
        amountCents: 125000,
        settledAmountCents: 0,
        dueDate: new Date('2026-05-30T00:00:00.000Z'),
        settlementDate: null,
        paymentMethod: null,
        currency: 'BRL',
        clientId: 7,
        processId: 14,
        categoryCode: 'HONORARIOS',
        category: { code: 'HONORARIOS', label: 'Honorarios' },
        responsibleUserId: 3,
        notes: null,
        createdAt: new Date('2026-05-21T10:00:00.000Z'),
        updatedAt: new Date('2026-05-21T10:00:00.000Z'),
        charges: [],
      },
    ],
  });
  const auditService = new FinanceAuditService(new InMemoryFinanceAuditRepository());
  const paymentProvider = {
    name: 'asaas',
    async generateCharge() {
      throw new Error('not used');
    },
    normalizeWebhook() {
      throw new Error('normalizeWebhook should not be called for canonical input');
    },
  };

  const billingService = new FinanceBillingService({
    repository,
    paymentProvider: {
      ...paymentProvider,
      async generateCharge() {
        return {
          provider: 'asaas',
          externalId: 'pay_91',
          paymentUrl: 'https://provider.local/pay_91',
          pixCode: null,
          boletoBarcode: null,
          providerPayload: { id: 'pay_91' },
        };
      },
    },
    auditService,
    now: () => new Date('2026-05-21T13:00:00.000Z'),
  });

  const generated = await billingService.generate({
    entryId: 91,
    method: 'payment_link',
    expiresAt: '2026-05-30T23:59:59.000Z',
    recipientEmail: 'cliente@orion.com',
    recipientPhone: null,
    idempotencyKey: 'charge:91:link',
    actor: { source: 'user', userId: 4, email: 'cobranca@lexora.local', role: 'FIN' },
  });

  const service = new FinanceWebhookService({
    repository,
    paymentProvider,
    auditService,
    now: () => new Date('2026-05-22T15:00:00.000Z'),
  });

  const result = await service.handle({
    provider: 'asaas',
    providerEventId: 'evt_asaas_paid_91',
    chargeExternalId: generated.charge.externalId,
    status: 'paid',
    paidAt: '2026-05-22T14:15:00.000Z',
    amountPaidCents: 125000,
    idempotencyKey: 'evt_asaas_paid_91',
    actor: { source: 'api', email: 'webhook@asaas.local', role: 'system' },
  });

  assert.equal(result.charge.status, 'paid');
  assert.equal(result.entry.status, 'paid');
  assert.equal(result.entry.paymentMethod, 'link');
  assert.equal(repository.listChargeEventRows().at(-1).providerEventId, 'evt_asaas_paid_91');
});
