import { FinanceDomainError, type FinanceChargeMethod } from '../shared';

export interface MockChargeDraftInput {
  entryId: number;
  method: FinanceChargeMethod;
  amountCents: number;
  dueDate: string;
  expiresAt: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
}

export interface MockChargeDraftOutput {
  provider: 'mock';
  externalId: string;
  paymentUrl: string;
  pixCode: string | null;
  boletoBarcode: string | null;
  providerPayload: Record<string, unknown>;
}

export class MockFinancePaymentProvider {
  generateCharge(input: MockChargeDraftInput): MockChargeDraftOutput {
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
}
