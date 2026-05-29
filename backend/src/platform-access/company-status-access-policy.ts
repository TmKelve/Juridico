export const tenantCompanyStatuses = ['active', 'grace_period', 'past_due', 'read_only', 'suspended', 'cancelled'] as const;
export type TenantCompanyStatus = (typeof tenantCompanyStatuses)[number];

export const platformAccessOperations = ['read', 'write'] as const;
export type PlatformAccessOperation = (typeof platformAccessOperations)[number];

export type CompanyStatusAccessDecision = {
  allowed: boolean;
  reason:
    | 'STATUS_ALLOWED_ACTIVE'
    | 'STATUS_ALLOWED_GRACE_PERIOD'
    | 'STATUS_BLOCKED_PAST_DUE_WRITE'
    | 'STATUS_BLOCKED_READ_ONLY_WRITE'
    | 'STATUS_BLOCKED_SUSPENDED'
    | 'STATUS_BLOCKED_CANCELLED'
    | 'STATUS_BLOCKED_UNKNOWN';
  normalizedStatus: TenantCompanyStatus | null;
  operation: PlatformAccessOperation;
};

export function normalizeTenantCompanyStatus(value: unknown): TenantCompanyStatus | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if ((tenantCompanyStatuses as readonly string[]).includes(normalized)) {
    return normalized as TenantCompanyStatus;
  }
  return null;
}

export function evaluateCompanyStatusAccess(input: {
  status: unknown;
  operation: PlatformAccessOperation;
}): CompanyStatusAccessDecision {
  const normalizedStatus = normalizeTenantCompanyStatus(input.status);
  if (!normalizedStatus) {
    return {
      allowed: false,
      reason: 'STATUS_BLOCKED_UNKNOWN',
      normalizedStatus,
      operation: input.operation,
    };
  }

  if (normalizedStatus === 'active') {
    return { allowed: true, reason: 'STATUS_ALLOWED_ACTIVE', normalizedStatus, operation: input.operation };
  }

  if (normalizedStatus === 'grace_period') {
    return { allowed: true, reason: 'STATUS_ALLOWED_GRACE_PERIOD', normalizedStatus, operation: input.operation };
  }

  if (normalizedStatus === 'past_due') {
    if (input.operation === 'write') {
      return { allowed: false, reason: 'STATUS_BLOCKED_PAST_DUE_WRITE', normalizedStatus, operation: input.operation };
    }
    return { allowed: true, reason: 'STATUS_ALLOWED_GRACE_PERIOD', normalizedStatus, operation: input.operation };
  }

  if (normalizedStatus === 'read_only') {
    if (input.operation === 'write') {
      return { allowed: false, reason: 'STATUS_BLOCKED_READ_ONLY_WRITE', normalizedStatus, operation: input.operation };
    }
    return { allowed: true, reason: 'STATUS_ALLOWED_GRACE_PERIOD', normalizedStatus, operation: input.operation };
  }

  if (normalizedStatus === 'suspended') {
    return { allowed: false, reason: 'STATUS_BLOCKED_SUSPENDED', normalizedStatus, operation: input.operation };
  }

  return { allowed: false, reason: 'STATUS_BLOCKED_CANCELLED', normalizedStatus, operation: input.operation };
}
