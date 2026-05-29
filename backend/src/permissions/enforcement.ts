import type { RoleContext } from '../roles/roles';
import { resolveRole } from '../roles/roles';

type EnforcementInput = {
  role: string;
  targetContext?: RoleContext | null;
};

type EnforcementResult =
  | { allowed: true; resolvedContext: RoleContext; role: string; isLegacyMapped: boolean }
  | { allowed: false; reason: string };

export function enforcePermissionContext(input: EnforcementInput): EnforcementResult {
  const resolved = resolveRole(input.role);

  if (!resolved.role || !resolved.context) {
    return { allowed: false, reason: 'AUTHZ_ROLE_UNKNOWN' };
  }

  if (input.targetContext && input.targetContext !== resolved.context) {
    return { allowed: false, reason: 'AUTHZ_CONTEXT_MISMATCH' };
  }

  return {
    allowed: true,
    resolvedContext: resolved.context,
    role: resolved.role,
    isLegacyMapped: resolved.isLegacyMapped,
  };
}

