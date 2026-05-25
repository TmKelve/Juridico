export const authzScopes = ['own', 'team', 'portfolio', 'global', 'denied'] as const;
export type AuthzScope = (typeof authzScopes)[number];

export const manageableAuthzScopes = ['own', 'team', 'portfolio', 'global'] as const;
export type ManageableAuthzScope = (typeof manageableAuthzScopes)[number];

export const authzResourceTypes = ['task', 'attendance', 'portfolio', 'team', 'productivity', 'export'] as const;
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
] as const;

export type AuthzPermissionCatalogEntry = (typeof authzPermissionCatalog)[number];
export type AuthzPermissionKey = AuthzPermissionCatalogEntry['key'];

export type AuthzGrant = {
  permissionKey: AuthzPermissionKey;
  scopes: ManageableAuthzScope[];
};

const authzRoleGrants: Record<string, AuthzGrant[]> = {
  ADM: authzPermissionCatalog.map((entry) => ({
    permissionKey: entry.key,
    scopes: ['global'],
  })),
  ADV: [
    { permissionKey: 'task.view', scopes: ['own', 'team', 'portfolio'] },
    { permissionKey: 'task.create', scopes: ['own', 'team', 'portfolio'] },
    { permissionKey: 'task.update', scopes: ['own', 'team', 'portfolio'] },
    { permissionKey: 'task.linkEntities', scopes: ['own', 'team', 'portfolio'] },
    { permissionKey: 'task.followup.schedule', scopes: ['own', 'team', 'portfolio'] },
    { permissionKey: 'attendance.view', scopes: ['own', 'team', 'portfolio'] },
    { permissionKey: 'attendance.create', scopes: ['own', 'team', 'portfolio'] },
    { permissionKey: 'attendance.updateSla', scopes: ['own', 'team', 'portfolio'] },
    { permissionKey: 'attendance.convertToTask', scopes: ['own', 'team', 'portfolio'] },
    { permissionKey: 'attendance.convertToDeadline', scopes: ['own', 'team', 'portfolio'] },
    { permissionKey: 'team.view', scopes: ['team', 'portfolio'] },
    { permissionKey: 'portfolio.view', scopes: ['portfolio'] },
    { permissionKey: 'productivity.view', scopes: ['own', 'team', 'portfolio'] },
    { permissionKey: 'productivity.snapshot', scopes: ['own', 'team', 'portfolio'] },
    { permissionKey: 'export.tasks', scopes: ['own', 'team', 'portfolio'] },
    { permissionKey: 'export.attendances', scopes: ['own', 'team', 'portfolio'] },
  ],
  ATD: [
    { permissionKey: 'task.view', scopes: ['own', 'team'] },
    { permissionKey: 'task.create', scopes: ['own', 'team'] },
    { permissionKey: 'task.update', scopes: ['own', 'team'] },
    { permissionKey: 'task.followup.schedule', scopes: ['own', 'team'] },
    { permissionKey: 'attendance.view', scopes: ['own', 'team'] },
    { permissionKey: 'attendance.create', scopes: ['own', 'team'] },
    { permissionKey: 'attendance.updateSla', scopes: ['own', 'team'] },
    { permissionKey: 'attendance.convertToTask', scopes: ['own', 'team'] },
    { permissionKey: 'team.view', scopes: ['team'] },
    { permissionKey: 'portfolio.view', scopes: ['team'] },
    { permissionKey: 'productivity.view', scopes: ['own', 'team'] },
    { permissionKey: 'productivity.snapshot', scopes: ['own', 'team'] },
    { permissionKey: 'export.tasks', scopes: ['own', 'team'] },
    { permissionKey: 'export.attendances', scopes: ['own', 'team'] },
  ],
  FIN: [
    { permissionKey: 'portfolio.view', scopes: ['global'] },
    { permissionKey: 'productivity.view', scopes: ['global'] },
    { permissionKey: 'productivity.snapshot', scopes: ['global'] },
    { permissionKey: 'productivity.export', scopes: ['global'] },
    { permissionKey: 'export.productivity', scopes: ['global'] },
  ],
};

const permissionCatalogByKey = new Map<AuthzPermissionKey, AuthzPermissionCatalogEntry>(
  authzPermissionCatalog.map((entry) => [entry.key, entry]),
);

export function listAuthzGrants(role: string): AuthzGrant[] {
  return authzRoleGrants[role] ?? [];
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
