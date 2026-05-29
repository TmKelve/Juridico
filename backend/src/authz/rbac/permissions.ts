import { listRoleGrants } from '../../permissions/matrix';
import { resolveRole } from '../../roles/roles';

export const authzScopes = ['own', 'team', 'portfolio', 'global', 'denied'] as const;
export type AuthzScope = (typeof authzScopes)[number];

export const manageableAuthzScopes = ['own', 'team', 'portfolio', 'global'] as const;
export type ManageableAuthzScope = (typeof manageableAuthzScopes)[number];

export const authzResourceTypes = ['task', 'attendance', 'portfolio', 'team', 'productivity', 'export', 'ai', 'bi', 'timesheet', 'mobile'] as const;
export type AuthzResourceType = (typeof authzResourceTypes)[number];

export const authzPermissionCatalog = [
  { key: 'task.view', resourceType: 'task', sensitive: false, requiresAudit: false },
  { key: 'task.create', resourceType: 'task', sensitive: false, requiresAudit: true },
  { key: 'task.update', resourceType: 'task', sensitive: false, requiresAudit: true },
  { key: 'task.linkEntities', resourceType: 'task', sensitive: false, requiresAudit: true },
  { key: 'task.followup.schedule', resourceType: 'task', sensitive: false, requiresAudit: true },
  { key: 'task.bulkReassignOwner', resourceType: 'task', sensitive: true, requiresAudit: true },
  { key: 'attendance.view', resourceType: 'attendance', sensitive: false, requiresAudit: false },
  { key: 'attendance.create', resourceType: 'attendance', sensitive: false, requiresAudit: true },
  { key: 'attendance.updateSla', resourceType: 'attendance', sensitive: false, requiresAudit: true },
  { key: 'attendance.closeOutOfSla', resourceType: 'attendance', sensitive: true, requiresAudit: true },
  { key: 'attendance.convertToTask', resourceType: 'attendance', sensitive: false, requiresAudit: true },
  { key: 'attendance.convertToDeadline', resourceType: 'attendance', sensitive: false, requiresAudit: true },
  { key: 'team.view', resourceType: 'team', sensitive: false, requiresAudit: false },
  { key: 'team.assignOwnership', resourceType: 'team', sensitive: false, requiresAudit: true },
  { key: 'team.reassignPortfolio', resourceType: 'team', sensitive: true, requiresAudit: true },
  { key: 'portfolio.view', resourceType: 'portfolio', sensitive: false, requiresAudit: false },
  { key: 'portfolio.assignOwnership', resourceType: 'portfolio', sensitive: false, requiresAudit: true },
  { key: 'portfolio.reassign', resourceType: 'portfolio', sensitive: true, requiresAudit: true },
  { key: 'productivity.view', resourceType: 'productivity', sensitive: false, requiresAudit: false },
  { key: 'productivity.snapshot', resourceType: 'productivity', sensitive: false, requiresAudit: true },
  { key: 'productivity.export', resourceType: 'productivity', sensitive: true, requiresAudit: true },
  { key: 'export.tasks', resourceType: 'export', sensitive: false, requiresAudit: true },
  { key: 'export.attendances', resourceType: 'export', sensitive: false, requiresAudit: true },
  { key: 'export.productivity', resourceType: 'export', sensitive: true, requiresAudit: true },
  { key: 'ai.view', resourceType: 'ai', sensitive: false, requiresAudit: false },
  { key: 'ai.summary.generate', resourceType: 'ai', sensitive: false, requiresAudit: true },
  { key: 'ai.recommendation.generate', resourceType: 'ai', sensitive: false, requiresAudit: true },
  { key: 'ai.draft.generate', resourceType: 'ai', sensitive: true, requiresAudit: true },
  { key: 'ai.checklist.suggest', resourceType: 'ai', sensitive: false, requiresAudit: true },
  { key: 'ai.audit.view', resourceType: 'ai', sensitive: true, requiresAudit: true },
  { key: 'ai.budget.manage', resourceType: 'ai', sensitive: true, requiresAudit: true },
  { key: 'bi.view', resourceType: 'bi', sensitive: false, requiresAudit: false },
  { key: 'bi.snapshot.generate', resourceType: 'bi', sensitive: false, requiresAudit: true },
  { key: 'bi.export.generate', resourceType: 'bi', sensitive: true, requiresAudit: true },
  { key: 'timesheet.view', resourceType: 'timesheet', sensitive: false, requiresAudit: false },
  { key: 'timesheet.entry.create', resourceType: 'timesheet', sensitive: false, requiresAudit: true },
  { key: 'timesheet.entry.update', resourceType: 'timesheet', sensitive: false, requiresAudit: true },
  { key: 'timesheet.entry.approve', resourceType: 'timesheet', sensitive: true, requiresAudit: true },
  { key: 'timesheet.report.view', resourceType: 'timesheet', sensitive: false, requiresAudit: true },
  { key: 'timesheet.period.close', resourceType: 'timesheet', sensitive: true, requiresAudit: true },
  { key: 'mobile.feed.view', resourceType: 'mobile', sensitive: false, requiresAudit: false },
] as const;

export type AuthzPermissionCatalogEntry = (typeof authzPermissionCatalog)[number];
export type AuthzPermissionKey = AuthzPermissionCatalogEntry['key'];

export type AuthzGrant = {
  permissionKey: AuthzPermissionKey;
  scopes: ManageableAuthzScope[];
};

const permissionCatalogByKey = new Map<AuthzPermissionKey, AuthzPermissionCatalogEntry>(
  authzPermissionCatalog.map((entry) => [entry.key, entry]),
);

export function listAuthzGrants(role: string): AuthzGrant[] {
  const resolved = resolveRole(role);
  if (!resolved.role || !resolved.context) {
    return [];
  }

  return listRoleGrants(resolved.role, resolved.context);
}

export function listAuthzPermissions(role: string): AuthzPermissionKey[] {
  return listAuthzGrants(role).map((grant) => grant.permissionKey);
}

export function listAuthzPermissionCatalog(role?: string) {
  const grantedScopesByPermission = new Map<AuthzPermissionKey, ManageableAuthzScope[]>();

  if (role) {
    for (const grant of listAuthzGrants(role)) {
      grantedScopesByPermission.set(grant.permissionKey, [...grant.scopes]);
    }
  }

  return authzPermissionCatalog.map((entry) => ({
    ...entry,
    grantedScopes: grantedScopesByPermission.get(entry.key) ?? [],
  }));
}

export function getPermissionDefinition(permissionKey: string): AuthzPermissionCatalogEntry | null {
  return permissionCatalogByKey.get(permissionKey as AuthzPermissionKey) ?? null;
}

export function hasAuthzPermission(role: string, permissionKey: AuthzPermissionKey) {
  return listAuthzPermissions(role).includes(permissionKey);
}
