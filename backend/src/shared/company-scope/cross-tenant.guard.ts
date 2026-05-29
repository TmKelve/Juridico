export class CrossTenantAccessError extends Error {
  constructor(message = 'Cross-tenant access denied: target company is outside authenticated scope.') {
    super(message);
    this.name = 'CrossTenantAccessError';
  }
}

function normalizeCompanyId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return null;
}

export function isCompanyScopeAllowed(input: { authenticatedCompanyId: unknown; targetCompanyId: unknown }) {
  const authenticated = normalizeCompanyId(input.authenticatedCompanyId);
  const target = normalizeCompanyId(input.targetCompanyId);
  return authenticated !== null && target !== null && authenticated === target;
}

export function assertCompanyScopeAllowed(input: {
  authenticatedCompanyId: unknown;
  targetCompanyId: unknown;
  message?: string;
}) {
  if (!isCompanyScopeAllowed(input)) {
    throw new CrossTenantAccessError(input.message);
  }
}

