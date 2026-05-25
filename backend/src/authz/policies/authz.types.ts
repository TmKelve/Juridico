import type { AuthzPermissionKey, AuthzResourceType, AuthzScope, ManageableAuthzScope } from '../rbac/permissions';

export type AuthzActor = {
  userId: number;
  role: string;
  teamIds?: Array<number | string>;
  portfolioIds?: Array<number | string>;
};

export type AuthzCheckContext = {
  ownerUserId?: number | null;
  teamId?: number | string | null;
  portfolioId?: number | string | null;
  primaryOwnerUserId?: number | null;
  backupOwnerUserId?: number | null;
  memberUserIds?: number[];
  teamMemberUserIds?: number[];
  portfolioMemberUserIds?: number[];
  allowedScopes?: ManageableAuthzScope[];
  requiresAudit?: boolean;
  sensitive?: boolean;
};

export type AuthzCheckInput = {
  actor: AuthzActor;
  permissionKey: AuthzPermissionKey | string;
  resourceType: AuthzResourceType;
  resourceId?: number | string | null;
  context?: AuthzCheckContext;
};

export type AuthzDecision = {
  allowed: boolean;
  permissionKey: string;
  scope: AuthzScope;
  reason: string;
  sensitive: boolean;
  requiresAudit: boolean;
};
