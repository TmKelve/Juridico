import { FinanceDomainError, type FinanceChargeMethod, type FinanceChargeStatus } from '../shared';

export interface FinanceChargeDraftInput {
  entryId: number;
  method: FinanceChargeMethod;
  amountCents: number;
  dueDate: string;
  expiresAt: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
  metadata?: Record<string, unknown>;
}

export interface FinanceChargeDraftOutput {
  provider: string;
  externalId: string;
  paymentUrl: string | null;
  pixCode: string | null;
  boletoBarcode: string | null;
  providerPayload: Record<string, unknown>;
}

export interface FinanceWebhookNormalizationInput {
  payload: Record<string, unknown>;
  providerEventId?: string | null;
  headers?: Record<string, unknown> | null;
}

export interface FinanceWebhookNormalizationOutput {
  provider: string;
  providerEventId: string;
  chargeExternalId: string;
  status: FinanceChargeStatus;
  paidAt: string | null;
  amountPaidCents: number | null;
  rawPayload: Record<string, unknown>;
}

export interface FinancePaymentProvider {
  readonly name: string;
  generateCharge(input: FinanceChargeDraftInput): Promise<FinanceChargeDraftOutput> | FinanceChargeDraftOutput;
  verifyWebhook?(input: FinanceWebhookNormalizationInput): void | Promise<void>;
  normalizeWebhook?(input: FinanceWebhookNormalizationInput): Promise<FinanceWebhookNormalizationOutput> | FinanceWebhookNormalizationOutput;
}

export function assertString(value: unknown, code: string, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new FinanceDomainError(`Campo obrigatório do provider: ${field}`, 400, code, { field });
  }
  return value.trim();
}
