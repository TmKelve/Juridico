const test = require('node:test');
const assert = require('node:assert/strict');

test('HttpFinancePaymentProvider generates a real-provider charge draft from HTTP response', async () => {
  const { HttpFinancePaymentProvider } = require('../../../dist/finance/payment-links/http-payment-provider.js');

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      id: 'pay_123',
      invoiceUrl: 'https://gateway.local/invoice/pay_123',
      pixQrCode: 'PIX-CODE-123',
      bankSlipBarcode: '341912345',
    }),
  });

  try {
    const provider = new HttpFinancePaymentProvider({
      providerName: 'asaas',
      baseUrl: 'https://gateway.local',
      apiKey: 'secret',
      chargePath: '/payments',
    });

    const result = await provider.generateCharge({
      entryId: 41,
      method: 'pix',
      amountCents: 185000,
      dueDate: '2026-06-10',
      expiresAt: null,
      recipientEmail: 'financeiro@cliente.com',
      recipientPhone: null,
      metadata: { description: 'Honorarios' },
    });

    assert.equal(result.provider, 'asaas');
    assert.equal(result.externalId, 'pay_123');
    assert.equal(result.paymentUrl, 'https://gateway.local/invoice/pay_123');
    assert.equal(result.pixCode, 'PIX-CODE-123');
  } finally {
    global.fetch = originalFetch;
  }
});

test('HttpFinancePaymentProvider normalizes webhook payload into finance webhook contract', async () => {
  const { HttpFinancePaymentProvider } = require('../../../dist/finance/payment-links/http-payment-provider.js');

  const provider = new HttpFinancePaymentProvider({
    providerName: 'asaas',
    baseUrl: 'https://gateway.local',
    apiKey: 'secret',
    chargePath: '/payments',
  });

  const result = provider.normalizeWebhook({
    payload: {
      id: 'evt_1',
      payment: {
        id: 'pay_123',
        status: 'RECEIVED',
        value: 1850,
        paymentDate: '2026-05-22',
      },
    },
  });

  assert.equal(result.provider, 'asaas');
  assert.equal(result.providerEventId, 'evt_1');
  assert.equal(result.chargeExternalId, 'pay_123');
  assert.equal(result.status, 'paid');
  assert.equal(result.amountPaidCents, 185000);
  assert.equal(result.paidAt, '2026-05-22T00:00:00.000Z');
});

test('HttpFinancePaymentProvider validates Asaas webhook token when secret is configured', async () => {
  const { HttpFinancePaymentProvider } = require('../../../dist/finance/payment-links/http-payment-provider.js');

  const provider = new HttpFinancePaymentProvider({
    providerName: 'asaas',
    baseUrl: 'https://gateway.local',
    apiKey: 'secret',
    chargePath: '/payments',
    webhookSecret: 'whsec_abc',
  });

  provider.verifyWebhook({
    payload: { id: 'evt_1' },
    headers: { 'asaas-access-token': 'whsec_abc' },
    providerEventId: 'evt_1',
  });

  assert.throws(() => provider.verifyWebhook({
    payload: { id: 'evt_1' },
    headers: { 'asaas-access-token': 'wrong' },
    providerEventId: 'evt_1',
  }), /Webhook financeiro com assinatura inválida/);
});
