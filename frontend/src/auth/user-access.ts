import type { CompanyContextState, UserRole, UserType } from '@/session/company-context';
import { isMutationBlockedByStatus } from '@/platform/access';

const PRIVILEGED_MUTATION_ROLES: readonly UserRole[] = ['OWNER', 'ADMIN', 'LAWYER', 'ASSISTANT'] as const;

export type MutationAccessResult = {
  allowed: boolean;
  reason:
    | 'ok'
    | 'blocked_by_company_status'
    | 'blocked_by_user_type'
    | 'blocked_by_role';
};

export function canMutate(context: CompanyContextState): MutationAccessResult {
  if (isMutationBlockedByStatus(context.status)) {
    return { allowed: false, reason: 'blocked_by_company_status' };
  }
  if (!isMutationUserTypeAllowed(context.userType)) {
    return { allowed: false, reason: 'blocked_by_user_type' };
  }
  if (!PRIVILEGED_MUTATION_ROLES.includes(context.role)) {
    return { allowed: false, reason: 'blocked_by_role' };
  }
  return { allowed: true, reason: 'ok' };
}

export function assertCanMutate(context: CompanyContextState): void {
  const access = canMutate(context);
  if (!access.allowed) {
    throw new Error(`Mutation blocked: ${access.reason}`);
  }
}

function isMutationUserTypeAllowed(userType: UserType): boolean {
  return userType === 'internal';
}
