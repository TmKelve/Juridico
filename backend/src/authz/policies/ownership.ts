import { manageableAuthzScopes, type ManageableAuthzScope } from '../rbac/permissions';
import type { AuthzActor, AuthzCheckContext } from './authz.types';

function matchesScalar(left: number | string | null | undefined, values: Array<number | string> | undefined) {
  if (left === null || left === undefined || !values?.length) {
    return false;
  }

  return values.some((value) => String(value) === String(left));
}

function includesUser(userId: number, values: number[] | undefined) {
  return Array.isArray(values) ? values.includes(userId) : false;
}

export function resolveOwnershipScope(actor: AuthzActor, context: AuthzCheckContext = {}): ManageableAuthzScope | null {
  if (
    context.ownerUserId === actor.userId ||
    context.primaryOwnerUserId === actor.userId ||
    context.backupOwnerUserId === actor.userId ||
    includesUser(actor.userId, context.memberUserIds)
  ) {
    return 'own';
  }

  if (
    matchesScalar(context.teamId, actor.teamIds) ||
    includesUser(actor.userId, context.teamMemberUserIds)
  ) {
    return 'team';
  }

  if (
    matchesScalar(context.portfolioId, actor.portfolioIds) ||
    includesUser(actor.userId, context.portfolioMemberUserIds)
  ) {
    return 'portfolio';
  }

  return null;
}

export function normalizeAllowedScopes(scopes: ManageableAuthzScope[] | undefined) {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return [...manageableAuthzScopes];
  }

  return scopes.filter((scope, index, list) => manageableAuthzScopes.includes(scope) && list.indexOf(scope) === index);
}
