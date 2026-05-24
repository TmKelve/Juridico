import { FinanceDomainError } from '../shared';
import type {
  FinanceChargeDraftInput,
  FinanceChargeDraftOutput,
  FinancePaymentProvider,
  FinanceWebhookNormalizationInput,
  FinanceWebhookNormalizationOutput,
} from './finance-payment-provider';

export class MockFinancePaymentProvider implements FinancePaymentProvider {
  readonly name = 'mock';

  generateCharge(input: FinanceChargeDraftInput): FinanceChargeDraftOutput {
    const suffix = `${input.entryId}_${input.method}_${Date.now()}`;
    const externalId = `mock_charge_${suffix}`;
    const paymentUrl = `https://mock.lexora.local/pay/${externalId}`;

    if (!['pix', 'boleto', 'payment_link'].includes(input.method)) {
      throw new FinanceDomainError('Método de cobrança mock inválido', 400, 'FIN_ENTRY_NOT_CHARGEABLE');
    }

    return {
      provider: 'mock',
      externalId,
      paymentUrl,
      pixCode: input.method === 'pix' ? `PIX|${externalId}|${input.amountCents}` : null,
      boletoBarcode: input.method === 'boleto' ? `34191${String(input.amountCents).padStart(10, '0')}${input.entryId}` : null,
      providerPayload: {
        dueDate: input.dueDate,
        expiresAt: input.expiresAt,
        recipientEmail: input.recipientEmail,
        recipientPhone: input.recipientPhone,
      },
    };
  }

  normalizeWebhook(input: FinanceWebhookNormalizationInput): FinanceWebhookNormalizationOutput {
    const payload = input.payload ?? {};
    const providerEventId = typeof input.providerEventId === 'string' && input.providerEventId.trim()
      ? input.providerEventId.trim()
      : typeof payload.providerEventId === 'string' && payload.providerEventId.trim()
        ? payload.providerEventId.trim()
        : `mock_evt_${Date.now()}`;
    const chargeExternalId = typeof payload.chargeExternalId === 'string' ? payload.chargeExternalId : '';
    const status = typeof payload.status === 'string' && payload.status !== 'draft' ? payload.status : 'pending';

    return {
      provider: this.name,
      providerEventId,
      chargeExternalId,
      status: status as FinanceWebhookNormalizationOutput['status'],
      paidAt: typeof payload.paidAt === 'string' ? payload.paidAt : null,
      amountPaidCents: typeof payload.amountPaidCents === 'number' ? payload.amountPaidCents : null,
      rawPayload: payload,
    };
  }
}
