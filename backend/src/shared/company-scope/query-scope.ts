import { assertCompanyScopeAllowed } from './cross-tenant.guard';

type AnyRecord = Record<string, unknown>;

function normalizeCompanyId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return null;
}

export class CompanyScopeQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CompanyScopeQueryError';
  }
}

export function createRequiredCompanyScope(companyId: unknown) {
  const normalized = normalizeCompanyId(companyId);
  if (!normalized) {
    throw new CompanyScopeQueryError('A valid companyId is required to build query scope.');
  }
  return { companyId: normalized };
}

export function withCompanyScope<TWhere extends AnyRecord>(
  where: TWhere | null | undefined,
  authenticatedCompanyId: unknown,
): TWhere & { companyId: string } {
  const normalizedCompanyId = normalizeCompanyId(authenticatedCompanyId);
  if (!normalizedCompanyId) {
    throw new CompanyScopeQueryError('A valid authenticated companyId is required to apply query scope.');
  }

  const baseWhere = (where ?? {}) as AnyRecord;
  if (baseWhere.companyId !== undefined) {
    assertCompanyScopeAllowed({
      authenticatedCompanyId: normalizedCompanyId,
      targetCompanyId: baseWhere.companyId,
      message: 'Query scope denied: companyId filter is outside authenticated tenant.',
    });
  }

  return {
    ...(baseWhere as TWhere),
    companyId: normalizedCompanyId,
  };
}

