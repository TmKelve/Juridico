import type { AuthzCheckInput } from '../policies/authz.types';
import { evaluateCompanyStatusAccess, type PlatformAccessOperation } from '../../platform-access/company-status-access-policy';

export type CompanyStatusAccessContext = {
  companyStatus?: string | null;
  operation?: PlatformAccessOperation;
};

function inferWriteOperationFromPermission(permissionKey: string): PlatformAccessOperation {
  const normalized = permissionKey.trim().toLowerCase();
  if (
    normalized.endsWith('.view') ||
    normalized.includes('.view.') ||
    normalized.startsWith('view.') ||
    normalized.startsWith('read.')
  ) {
    return 'read';
  }
  return 'write';
}

function isPlatformActor(input: AuthzCheckInput): boolean {
  const role = input.actor.role.trim().toLowerCase();
  const context = input.context?.accessContext;
  return context === 'platform' || role.startsWith('platform_');
}

export function enforceCompanyStatusForAuthorization(input: {
  authzInput: AuthzCheckInput;
  statusContext?: CompanyStatusAccessContext;
}) {
  if (isPlatformActor(input.authzInput)) {
    return { allowed: true as const, reason: 'PLATFORM_BYPASS_COMPANY_STATUS' as const };
  }

  const companyStatus = input.statusContext?.companyStatus ?? null;
  if (!companyStatus) {
    return { allowed: true as const, reason: 'STATUS_NOT_PROVIDED' as const };
  }

  const operation = input.statusContext?.operation ?? inferWriteOperationFromPermission(input.authzInput.permissionKey);
  const decision = evaluateCompanyStatusAccess({ status: companyStatus, operation });
  if (decision.allowed) {
    return { allowed: true as const, reason: 'STATUS_ALLOWED' as const };
  }

  return {
    allowed: false as const,
    reason: `AUTHZ_DENIED_COMPANY_STATUS:${decision.reason}`,
  };
}
