import type { AuthTokenClaims } from '../auth/auth-claims';

export type PlatformPolicyDecision = {
  isPlatformUser: boolean;
  hasOperationalContext: boolean;
  allowSessionBootstrap: boolean;
  allowOperationalAccess: boolean;
  reason: 'PLATFORM_USER_NEEDS_COMPANY_CONTEXT' | 'PLATFORM_USER_WITH_COMPANY_CONTEXT' | 'OPERATIONAL_USER';
};

export function evaluatePlatformUserPolicy(claims: AuthTokenClaims): PlatformPolicyDecision {
  const isPlatformUser = claims.userType === 'platform';
  const hasOperationalContext = typeof claims.companyId === 'number' && Number.isFinite(claims.companyId);

  if (!isPlatformUser) {
    return {
      isPlatformUser: false,
      hasOperationalContext,
      allowSessionBootstrap: true,
      allowOperationalAccess: true,
      reason: 'OPERATIONAL_USER',
    };
  }

  if (hasOperationalContext) {
    return {
      isPlatformUser: true,
      hasOperationalContext: true,
      allowSessionBootstrap: true,
      allowOperationalAccess: true,
      reason: 'PLATFORM_USER_WITH_COMPANY_CONTEXT',
    };
  }

  return {
    isPlatformUser: true,
    hasOperationalContext: false,
    allowSessionBootstrap: true,
    allowOperationalAccess: false,
    reason: 'PLATFORM_USER_NEEDS_COMPANY_CONTEXT',
  };
}
