import { checkAuthorization } from '../policies/authz.check';
import type { AuthzCheckInput, AuthzDecision } from '../policies/authz.types';
import {
  enforceCompanyStatusForAuthorization,
  type CompanyStatusAccessContext,
} from '../company-status/company-status-authz-enforcer';

export class AuthzForbiddenError extends Error {
  decision: AuthzDecision;

  constructor(decision: AuthzDecision) {
    super(decision.reason);
    this.name = 'AuthzForbiddenError';
    this.decision = decision;
  }
}

export function authorize(input: AuthzCheckInput) {
  return checkAuthorization(input);
}

export function ensureAuthorized(input: AuthzCheckInput) {
  const statusDecision = enforceCompanyStatusForAuthorization({ authzInput: input });
  if (!statusDecision.allowed) {
    throw new AuthzForbiddenError({
      allowed: false,
      permissionKey: input.permissionKey,
      scope: 'denied',
      reason: statusDecision.reason,
      sensitive: false,
      requiresAudit: false,
    });
  }

  const decision = authorize(input);
  if (!decision.allowed) {
    throw new AuthzForbiddenError(decision);
  }

  return decision;
}

export function ensureAuthorizedWithCompanyStatus(input: AuthzCheckInput, statusContext: CompanyStatusAccessContext) {
  const statusDecision = enforceCompanyStatusForAuthorization({ authzInput: input, statusContext });
  if (!statusDecision.allowed) {
    throw new AuthzForbiddenError({
      allowed: false,
      permissionKey: input.permissionKey,
      scope: 'denied',
      reason: statusDecision.reason,
      sensitive: false,
      requiresAudit: false,
    });
  }

  return ensureAuthorized(input);
}

export function createRouteAuthorizationGuard(defaultInput: Omit<AuthzCheckInput, 'actor' | 'resourceId' | 'context'>) {
  return (input: Pick<AuthzCheckInput, 'actor' | 'resourceId' | 'context'>) =>
    ensureAuthorized({
      ...defaultInput,
      ...input,
    });
}
