export type BillingCycle = 'monthly' | 'yearly';
export type PaymentAttemptStatus = 'pending' | 'authorized' | 'paid' | 'failed';

export type PaymentProviderChargeCommand = {
  invoiceId: number;
  companyId: number;
  externalInvoiceRef: string;
  amountCents: number;
  currency: string;
  customerEmail?: string | null;
};

export type PaymentProviderChargeResult = {
  provider: string;
  providerInvoiceId: string;
  checkoutUrl?: string | null;
  pixCode?: string | null;
  boletoUrl?: string | null;
  providerPayload?: Record<string, unknown>;
};

export type PaymentProviderWebhookPayload = {
  provider: string;
  providerEventId: string;
  providerInvoiceId: string;
  status: PaymentAttemptStatus;
  errorCode?: string | null;
  errorMessage?: string | null;
  paidAt?: string | null;
  providerPayload?: Record<string, unknown>;
};

export interface PlatformPaymentProviderAdapter {
  createCharge(command: PaymentProviderChargeCommand): Promise<PaymentProviderChargeResult>;
  normalizeWebhook(payload: unknown, headers: Record<string, unknown>): Promise<PaymentProviderWebhookPayload>;
}

export class MockPlatformPaymentProviderAdapter implements PlatformPaymentProviderAdapter {
  async createCharge(command: PaymentProviderChargeCommand): Promise<PaymentProviderChargeResult> {
    return {
      provider: 'mock',
      providerInvoiceId: `mock-invoice-${command.invoiceId}`,
      checkoutUrl: `https://mock-payments.local/checkout/${command.invoiceId}`,
      providerPayload: { mode: 'mock' },
    };
  }

  async normalizeWebhook(payload: unknown): Promise<PaymentProviderWebhookPayload> {
    const body = (payload ?? {}) as Record<string, unknown>;
    return {
      provider: typeof body.provider === 'string' ? body.provider : 'mock',
      providerEventId: typeof body.providerEventId === 'string' ? body.providerEventId : `mock-event-${Date.now()}`,
      providerInvoiceId: String(body.providerInvoiceId ?? ''),
      status: (body.status as PaymentAttemptStatus) ?? 'failed',
      errorCode: typeof body.errorCode === 'string' ? body.errorCode : null,
      errorMessage: typeof body.errorMessage === 'string' ? body.errorMessage : null,
      paidAt: typeof body.paidAt === 'string' ? body.paidAt : null,
      providerPayload: typeof body === 'object' ? body : {},
    };
  }
}
