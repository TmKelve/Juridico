import { SUBSCRIPTION_STATUSES, type CreateSubscriptionInput, type SubscriptionStatus, type TransitionSubscriptionInput } from './subscription.types';

const statusSet = new Set<SubscriptionStatus>(SUBSCRIPTION_STATUSES);

export class SubscriptionContractError extends Error {
  constructor(
    readonly code: string,
    readonly statusCode: number,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'SubscriptionContractError';
  }
}

export function validateCreateSubscriptionInput(input: Record<string, unknown>): CreateSubscriptionInput {
  return {
    companyId: requirePositiveInt('companyId', input.companyId, 'Empresa'),
    planId: requirePositiveInt('planId', input.planId, 'Plano'),
    status: normalizeOptionalStatus(input.status) ?? 'draft',
    checkoutReference: normalizeOptionalText(input.checkoutReference),
    externalReference: normalizeOptionalText(input.externalReference),
    currentPeriodStart: normalizeOptionalIsoDate('currentPeriodStart', input.currentPeriodStart),
    currentPeriodEnd: normalizeOptionalIsoDate('currentPeriodEnd', input.currentPeriodEnd),
    metadata: normalizeOptionalMetadata(input.metadata),
  };
}

export function validateTransitionSubscriptionInput(input: Record<string, unknown>): TransitionSubscriptionInput {
  return {
    subscriptionId: requirePositiveInt('subscriptionId', input.subscriptionId, 'Assinatura'),
    toStatus: requireStatus(input.toStatus),
    reason: normalizeOptionalText(input.reason),
    actor: normalizeOptionalText(input.actor),
    idempotencyKey: normalizeOptionalText(input.idempotencyKey),
    metadata: normalizeOptionalMetadata(input.metadata),
  };
}

function requireStatus(value: unknown): SubscriptionStatus {
  const normalized = normalizeOptionalText(value);
  if (!normalized || !statusSet.has(normalized as SubscriptionStatus)) {
    throw new SubscriptionContractError('SUBSCRIPTION_INVALID_STATUS', 400, 'Status da assinatura inválido.', { value });
  }
  return normalized as SubscriptionStatus;
}

function normalizeOptionalStatus(value: unknown): SubscriptionStatus | undefined {
  if (value === undefined || value === null) return undefined;
  return requireStatus(value);
}

function normalizeOptionalText(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new SubscriptionContractError('SUBSCRIPTION_INVALID_TEXT', 400, 'Campo textual inválido.', { value });
  }
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function requirePositiveInt(field: string, value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new SubscriptionContractError('SUBSCRIPTION_INVALID_NUMBER', 400, `${label} deve ser inteiro positivo.`, { field, value });
  }
  return value as number;
}

function normalizeOptionalIsoDate(field: string, value: unknown): string | undefined {
  const normalized = normalizeOptionalText(value);
  if (!normalized) return undefined;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new SubscriptionContractError('SUBSCRIPTION_INVALID_DATE', 400, 'Data inválida.', { field, value });
  }
  return date.toISOString();
}

function normalizeOptionalMetadata(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new SubscriptionContractError('SUBSCRIPTION_INVALID_METADATA', 400, 'Metadata deve ser objeto.', { value });
  }
  return value as Record<string, unknown>;
}
