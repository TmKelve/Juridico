import { checkAuthorization } from '../policies/authz.check';
import type { AuthzCheckInput, AuthzDecision } from '../policies/authz.types';

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
  const decision = authorize(input);
  if (!decision.allowed) {
    throw new AuthzForbiddenError(decision);
  }

  return decision;
}

export function createRouteAuthorizationGuard(defaultInput: Omit<AuthzCheckInput, 'actor' | 'resourceId' | 'context'>) {
  return (input: Pick<AuthzCheckInput, 'actor' | 'resourceId' | 'context'>) =>
    ensureAuthorized({
      ...defaultInput,
      ...input,
    });
}
