import { getPermissionDefinition, listAuthzGrants, type AuthzGrant, type AuthzPermissionKey } from '../rbac/permissions';
import { enforcePermissionContext } from '../../permissions/enforcement';
import { normalizeAllowedScopes, resolveOwnershipScope } from './ownership';
import type { AuthzCheckInput, AuthzDecision } from './authz.types';

function findGrant(grants: AuthzGrant[], permissionKey: AuthzPermissionKey) {
  return grants.find((grant) => grant.permissionKey === permissionKey) ?? null;
}

export function checkAuthorization(input: AuthzCheckInput): AuthzDecision {
  const contextEnforcement = enforcePermissionContext({
    role: input.actor.role,
    targetContext: input.context?.accessContext,
  });

  if (!contextEnforcement.allowed) {
    return {
      allowed: false,
      permissionKey: input.permissionKey,
      scope: 'denied',
      reason: contextEnforcement.reason,
      sensitive: false,
      requiresAudit: false,
    };
  }

  const definition = getPermissionDefinition(input.permissionKey);

  if (!definition) {
    return {
      allowed: false,
      permissionKey: input.permissionKey,
      scope: 'denied',
      reason: 'AUTHZ_PERMISSION_UNKNOWN',
      sensitive: false,
      requiresAudit: false,
    };
  }

  if (definition.resourceType !== input.resourceType) {
    return {
      allowed: false,
      permissionKey: input.permissionKey,
      scope: 'denied',
      reason: 'AUTHZ_RESOURCE_TYPE_MISMATCH',
      sensitive: definition.sensitive,
      requiresAudit: definition.requiresAudit,
    };
  }

  const grants = listAuthzGrants(input.actor.role);
  const grant = findGrant(grants, definition.key);

  if (!grant) {
    return {
      allowed: false,
      permissionKey: definition.key,
      scope: 'denied',
      reason: definition.sensitive ? 'AUTHZ_SENSITIVE_DENY_BY_DEFAULT' : 'AUTHZ_PERMISSION_DENIED',
      sensitive: definition.sensitive,
      requiresAudit: definition.requiresAudit,
    };
  }

  const allowedScopes = normalizeAllowedScopes(input.context?.allowedScopes);

  if (grant.scopes.includes('global') && allowedScopes.includes('global')) {
    return {
      allowed: true,
      permissionKey: definition.key,
      scope: 'global',
      reason: 'AUTHZ_ALLOWED_GLOBAL',
      sensitive: input.context?.sensitive ?? definition.sensitive,
      requiresAudit: input.context?.requiresAudit ?? definition.requiresAudit,
    };
  }

  const resolvedScope = resolveOwnershipScope(input.actor, input.context);

  if (!resolvedScope) {
    return {
      allowed: false,
      permissionKey: definition.key,
      scope: 'denied',
      reason: 'AUTHZ_SCOPE_UNRESOLVED',
      sensitive: input.context?.sensitive ?? definition.sensitive,
      requiresAudit: input.context?.requiresAudit ?? definition.requiresAudit,
    };
  }

  if (!allowedScopes.includes(resolvedScope)) {
    return {
      allowed: false,
      permissionKey: definition.key,
      scope: 'denied',
      reason: 'AUTHZ_SCOPE_OUTSIDE_ROUTE_POLICY',
      sensitive: input.context?.sensitive ?? definition.sensitive,
      requiresAudit: input.context?.requiresAudit ?? definition.requiresAudit,
    };
  }

  if (!grant.scopes.includes(resolvedScope)) {
    return {
      allowed: false,
      permissionKey: definition.key,
      scope: 'denied',
      reason: definition.sensitive ? 'AUTHZ_SENSITIVE_DENY_BY_DEFAULT' : 'AUTHZ_SCOPE_DENIED',
      sensitive: input.context?.sensitive ?? definition.sensitive,
      requiresAudit: input.context?.requiresAudit ?? definition.requiresAudit,
    };
  }

  return {
    allowed: true,
    permissionKey: definition.key,
    scope: resolvedScope,
    reason: `AUTHZ_ALLOWED_${resolvedScope.toUpperCase()}`,
    sensitive: input.context?.sensitive ?? definition.sensitive,
    requiresAudit: input.context?.requiresAudit ?? definition.requiresAudit,
  };
}
