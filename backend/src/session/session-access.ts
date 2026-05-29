import type { AuthTokenClaims } from '../auth/auth-claims';
import { evaluatePlatformUserPolicy } from '../platform-auth/platform-user-policy';

export type CompanyStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'PENDING';

export type SessionCompanyContext = {
  id: number;
  status: CompanyStatus;
};

export type ResolvedSession = {
  claims: AuthTokenClaims;
  company: SessionCompanyContext | null;
  platformPolicy: ReturnType<typeof evaluatePlatformUserPolicy>;
};

export type SessionAccessDecision = {
  allowed: boolean;
  reason:
    | 'SESSION_ALLOWED'
    | 'SESSION_DENIED_COMPANY_CONTEXT_REQUIRED'
    | 'SESSION_DENIED_COMPANY_NOT_ACTIVE';
  companyStatus: CompanyStatus | null;
};

export function resolveSessionContext(input: {
  claims: AuthTokenClaims;
  company?: SessionCompanyContext | null;
}): ResolvedSession {
  const policy = evaluatePlatformUserPolicy(input.claims);
  return {
    claims: input.claims,
    company: input.company ?? null,
    platformPolicy: policy,
  };
}

export function evaluateSessionAccess(session: ResolvedSession): SessionAccessDecision {
  if (!session.platformPolicy.allowOperationalAccess) {
    return {
      allowed: false,
      reason: 'SESSION_DENIED_COMPANY_CONTEXT_REQUIRED',
      companyStatus: null,
    };
  }

  const effectiveCompanyStatus = session.company?.status ?? null;

  if (effectiveCompanyStatus === null || effectiveCompanyStatus === 'ACTIVE') {
    return {
      allowed: true,
      reason: 'SESSION_ALLOWED',
      companyStatus: effectiveCompanyStatus,
    };
  }

  return {
    allowed: false,
    reason: 'SESSION_DENIED_COMPANY_NOT_ACTIVE',
    companyStatus: effectiveCompanyStatus,
  };
}
