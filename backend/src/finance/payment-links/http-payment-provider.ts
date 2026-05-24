import { FinanceDomainError } from '../shared';
import type {
  FinanceChargeDraftInput,
  FinanceChargeDraftOutput,
  FinancePaymentProvider,
  FinanceWebhookNormalizationInput,
  FinanceWebhookNormalizationOutput,
} from './finance-payment-provider';
import { assertString } from './finance-payment-provider';

type HttpProviderConfig = {
  providerName: string;
  baseUrl: string;
  apiKey: string;
  chargePath: string;
  webhookSecret?: string | null;
};

function mapMethod(method: FinanceChargeDraftInput['method']) {
  if (method === 'pix') return 'PIX';
  if (method === 'boleto') return 'BOLETO';
  return 'LINK';
}

function readHeader(headers: Record<string, unknown> | null | undefined, name: string) {
  if (!headers) return null;
  const direct = headers[name];
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  const lower = headers[name.toLowerCase()];
  if (typeof lower === 'string' && lower.trim()) return lower.trim();
  const upper = headers[name.toUpperCase()];
  if (typeof upper === 'string' && upper.trim()) return upper.trim();
  return null;
}

function mapStatus(value: unknown): FinanceWebhookNormalizationOutput['status'] {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (['RECEIVED', 'CONFIRMED', 'PAID'].includes(normalized)) return 'paid';
  if (['OVERDUE', 'EXPIRED'].includes(normalized)) return 'expired';
  if (['FAILED', 'REFUNDED', 'CHARGEBACK'].includes(normalized)) return 'failed';
  if (['CANCELLED', 'CANCELED'].includes(normalized)) return 'cancelled';
  return 'pending';
}

export class HttpFinancePaymentProvider implements FinancePaymentProvider {
  readonly name: string;

  constructor(private readonly config: HttpProviderConfig) {
    this.name = config.providerName;
  }

  async generateCharge(input: FinanceChargeDraftInput): Promise<FinanceChargeDraftOutput> {
    const url = new URL(this.config.chargePath, this.config.baseUrl).toString();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        externalReference: `entry-${input.entryId}`,
        billingType: mapMethod(input.method),
        value: Number((input.amountCents / 100).toFixed(2)),
        dueDate: input.dueDate,
        description: input.metadata?.description ?? `Finance entry ${input.entryId}`,
        email: input.recipientEmail ?? undefined,
        mobilePhone: input.recipientPhone ?? undefined,
        metadata: {
          entryId: input.entryId,
          ...input.metadata,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new FinanceDomainError('Falha ao criar cobrança no provider externo', 502, 'FIN_PROVIDER_ERROR', {
        provider: this.name,
        status: response.status,
        body: errorBody.slice(0, 500),
      });
    }

    const data = await response.json() as Record<string, unknown>;
    const externalId = assertString(
      data.id ?? data.externalId ?? data.chargeId,
      'FIN_PROVIDER_INVALID_RESPONSE',
      'id',
    );

    return {
      provider: this.name,
      externalId,
      paymentUrl: typeof data.invoiceUrl === 'string'
        ? data.invoiceUrl
        : typeof data.paymentLink === 'string'
          ? data.paymentLink
          : typeof data.bankSlipUrl === 'string'
            ? data.bankSlipUrl
            : null,
      pixCode: typeof data.pixQrCode === 'string'
        ? data.pixQrCode
        : typeof data.pixCopyPaste === 'string'
          ? data.pixCopyPaste
          : null,
      boletoBarcode: typeof data.bankSlipBarcode === 'string'
        ? data.bankSlipBarcode
        : typeof data.barCode === 'string'
          ? data.barCode
          : null,
      providerPayload: data,
    };
  }

  verifyWebhook(input: FinanceWebhookNormalizationInput) {
    if (!this.config.webhookSecret?.trim()) {
      return;
    }

    const token = this.name === 'asaas'
      ? readHeader(input.headers, 'asaas-access-token')
      : readHeader(input.headers, 'x-webhook-secret');

    if (token !== this.config.webhookSecret.trim()) {
      throw new FinanceDomainError('Webhook financeiro com assinatura inválida', 401, 'FIN_WEBHOOK_INVALID', {
        provider: this.name,
      });
    }
  }

  normalizeWebhook(input: FinanceWebhookNormalizationInput): FinanceWebhookNormalizationOutput {
    const payload = input.payload ?? {};
    const event = (payload.payment ?? payload.data ?? payload) as Record<string, unknown>;
    const externalId = assertString(
      event.id ?? event.externalId ?? event.chargeId,
      'FIN_WEBHOOK_INVALID',
      'payment.id',
    );
    const providerEventId = typeof input.providerEventId === 'string' && input.providerEventId.trim()
      ? input.providerEventId.trim()
      : typeof payload.id === 'string' && payload.id.trim()
        ? payload.id.trim()
        : `evt_${this.name}_${externalId}`;

    const value = typeof event.value === 'number'
      ? Math.round(event.value * 100)
      : typeof event.netValue === 'number'
        ? Math.round(event.netValue * 100)
        : null;

    return {
      provider: this.name,
      providerEventId,
      chargeExternalId: externalId,
      status: mapStatus(event.status ?? payload.status),
      paidAt: typeof event.paymentDate === 'string'
        ? `${event.paymentDate}T00:00:00.000Z`
        : typeof event.clientPaymentDate === 'string'
          ? `${event.clientPaymentDate}T00:00:00.000Z`
          : null,
      amountPaidCents: value,
      rawPayload: payload,
    };
  }
}

export function createFinancePaymentProviderFromEnv(env: NodeJS.ProcessEnv = process.env): FinancePaymentProvider {
  const provider = (env.FINANCE_PAYMENT_PROVIDER ?? 'mock').trim().toLowerCase();
  if (!provider || provider === 'mock') {
    const { MockFinancePaymentProvider } = require('./mock-payment-provider');
    return new MockFinancePaymentProvider();
  }

  const baseUrl = assertString(env.FINANCE_PROVIDER_BASE_URL, 'FIN_PROVIDER_CONFIG_INVALID', 'FINANCE_PROVIDER_BASE_URL');
  const apiKey = assertString(env.FINANCE_PROVIDER_API_KEY, 'FIN_PROVIDER_CONFIG_INVALID', 'FINANCE_PROVIDER_API_KEY');
  const chargePath = (env.FINANCE_PROVIDER_CHARGE_PATH ?? '/payments').trim() || '/payments';

  return new HttpFinancePaymentProvider({
    providerName: provider,
    baseUrl,
    apiKey,
    chargePath,
    webhookSecret: env.FINANCE_PROVIDER_WEBHOOK_SECRET ?? null,
  });
}
