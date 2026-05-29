import type { CreatePlanInput, UpdatePlanInput } from './plan.types';

export class PlanContractError extends Error {
  constructor(
    readonly code: string,
    readonly statusCode: number,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PlanContractError';
  }
}

export function validateCreatePlanInput(input: Record<string, unknown>): CreatePlanInput {
  return {
    code: requireText('code', input.code, 'Código do plano'),
    name: requireText('name', input.name, 'Nome do plano'),
    description: normalizeOptionalText(input.description),
    priceCents: requireNonNegativeInt('priceCents', input.priceCents, 'Preço do plano'),
    currency: normalizeOptionalText(input.currency) ?? 'BRL',
    billingCycle: normalizeOptionalText(input.billingCycle) ?? 'monthly',
    active: typeof input.active === 'boolean' ? input.active : true,
    metadata: normalizeMetadata(input.metadata),
  };
}

export function validateUpdatePlanInput(input: Record<string, unknown>): UpdatePlanInput {
  return {
    planId: requirePositiveInt('planId', input.planId, 'Plano'),
    name: normalizeOptionalText(input.name),
    description: normalizeOptionalText(input.description),
    priceCents: input.priceCents === undefined ? undefined : requireNonNegativeInt('priceCents', input.priceCents, 'Preço do plano'),
    currency: normalizeOptionalText(input.currency),
    billingCycle: normalizeOptionalText(input.billingCycle),
    active: typeof input.active === 'boolean' ? input.active : undefined,
    metadata: input.metadata === undefined ? undefined : normalizeMetadata(input.metadata),
  };
}

function normalizeOptionalText(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new PlanContractError('PLAN_INVALID_TEXT', 400, 'Campo textual inválido.', { value });
  }
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function requireText(field: string, value: unknown, label: string): string {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    throw new PlanContractError('PLAN_REQUIRED_FIELD', 400, `${label} é obrigatório.`, { field });
  }
  return normalized;
}

function requirePositiveInt(field: string, value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new PlanContractError('PLAN_INVALID_NUMBER', 400, `${label} deve ser inteiro positivo.`, { field, value });
  }
  return value as number;
}

function requireNonNegativeInt(field: string, value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new PlanContractError('PLAN_INVALID_NUMBER', 400, `${label} deve ser inteiro não negativo.`, { field, value });
  }
  return value as number;
}

function normalizeMetadata(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new PlanContractError('PLAN_INVALID_METADATA', 400, 'Metadata deve ser objeto.', { value });
  }
  return value as Record<string, unknown>;
}
