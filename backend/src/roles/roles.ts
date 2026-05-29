export const tenantRoles = ['company_admin', 'manager', 'lawyer', 'assistant', 'company_finance'] as const;
export type TenantRole = (typeof tenantRoles)[number];

export const platformRoles = ['platform_admin', 'platform_billing', 'platform_support'] as const;
export type PlatformRole = (typeof platformRoles)[number];

export const legacyRoles = ['ADM', 'ADV', 'FIN', 'ATD'] as const;
export type LegacyRole = (typeof legacyRoles)[number];

export type RoleContext = 'tenant' | 'platform';
export type AppRole = TenantRole | PlatformRole;

const legacyRoleMap: Record<LegacyRole, TenantRole> = {
  ADM: 'company_admin',
  ADV: 'lawyer',
  FIN: 'company_finance',
  ATD: 'assistant',
};

export type ResolvedRole = {
  inputRole: string;
  role: AppRole | null;
  context: RoleContext | null;
  isLegacyMapped: boolean;
};

function isTenantRole(role: string): role is TenantRole {
  return (tenantRoles as readonly string[]).includes(role);
}

function isPlatformRole(role: string): role is PlatformRole {
  return (platformRoles as readonly string[]).includes(role);
}

function isLegacyRole(role: string): role is LegacyRole {
  return (legacyRoles as readonly string[]).includes(role);
}

export function resolveRole(inputRole: string): ResolvedRole {
  if (isTenantRole(inputRole)) {
    return { inputRole, role: inputRole, context: 'tenant', isLegacyMapped: false };
  }

  if (isPlatformRole(inputRole)) {
    return { inputRole, role: inputRole, context: 'platform', isLegacyMapped: false };
  }

  if (isLegacyRole(inputRole)) {
    const role = legacyRoleMap[inputRole];
    return { inputRole, role, context: 'tenant', isLegacyMapped: true };
  }

  return { inputRole, role: null, context: null, isLegacyMapped: false };
}

