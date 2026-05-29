import type { PlatformCompanyActionName } from './company-management.types';

export class PlatformCompanyContractError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

function positiveInt(field: string, value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new PlatformCompanyContractError('PLATFORM_COMPANY_INVALID_ID', 422, `${field} inválido.`);
  }
  return parsed;
}

function optionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function validateCompanyId(companyId: unknown) {
  return positiveInt('companyId', companyId);
}

export function validateStatusActionInput(input: {
  companyId: unknown;
  action: PlatformCompanyActionName;
  reason?: unknown;
}) {
  const normalized = {
    companyId: validateCompanyId(input.companyId),
    action: input.action,
    reason: optionalString(input.reason),
  };

  if (
    (normalized.action === 'block' || normalized.action === 'cancel' || normalized.action === 'reactivate') &&
    !normalized.reason
  ) {
    throw new PlatformCompanyContractError('PLATFORM_COMPANY_REASON_REQUIRED', 422, 'Motivo é obrigatório.');
  }

  return normalized;
}

