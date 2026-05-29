export type CompanyContextClaims = {
  sub: number;
  role: string;
  email: string;
  companyId?: string | number | null;
  tenantId?: string | number | null;
  company?: {
    id?: string | number | null;
  } | null;
};

export type CompanyMembershipPort = {
  listActiveCompanyIdsByUser(userId: number): Promise<string[]>;
};

export type CompanyRequestContext = {
  userId: number;
  role: string;
  email: string;
  companyId: string;
  source: 'claim' | 'membership-singleton';
};

export class CompanyRequestContextError extends Error {
  constructor(
    public readonly code:
      | 'MISSING_COMPANY_CONTEXT'
      | 'NO_ACTIVE_COMPANY_MEMBERSHIP'
      | 'AMBIGUOUS_COMPANY_MEMBERSHIP'
      | 'CROSS_TENANT_FORBIDDEN',
    message: string,
  ) {
    super(message);
    this.name = 'CompanyRequestContextError';
  }
}

function normalizeCompanyId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return null;
}

function readClaimedCompanyId(claims: CompanyContextClaims) {
  return (
    normalizeCompanyId(claims.companyId) ??
    normalizeCompanyId(claims.tenantId) ??
    normalizeCompanyId(claims.company?.id)
  );
}

export async function resolveCompanyRequestContext(input: {
  claims: CompanyContextClaims;
  membershipPort: CompanyMembershipPort;
}): Promise<CompanyRequestContext> {
  const claimedCompanyId = readClaimedCompanyId(input.claims);
  const membershipCompanyIds = (await input.membershipPort.listActiveCompanyIdsByUser(input.claims.sub))
    .map((value) => normalizeCompanyId(value))
    .filter((value): value is string => typeof value === 'string');

  if (claimedCompanyId) {
    if (membershipCompanyIds.length === 0) {
      throw new CompanyRequestContextError(
        'NO_ACTIVE_COMPANY_MEMBERSHIP',
        'User has no active company membership to validate authenticated scope.',
      );
    }

    if (!membershipCompanyIds.includes(claimedCompanyId)) {
      throw new CompanyRequestContextError(
        'CROSS_TENANT_FORBIDDEN',
        'Authenticated company claim is not part of active user memberships.',
      );
    }

    return {
      userId: input.claims.sub,
      role: input.claims.role,
      email: input.claims.email,
      companyId: claimedCompanyId,
      source: 'claim',
    };
  }

  if (membershipCompanyIds.length === 0) {
    throw new CompanyRequestContextError(
      'MISSING_COMPANY_CONTEXT',
      'No company claim was provided and no active company membership was found.',
    );
  }

  if (membershipCompanyIds.length > 1) {
    throw new CompanyRequestContextError(
      'AMBIGUOUS_COMPANY_MEMBERSHIP',
      'No company claim was provided and the user has multiple active company memberships.',
    );
  }

  return {
    userId: input.claims.sub,
    role: input.claims.role,
    email: input.claims.email,
    companyId: membershipCompanyIds[0],
    source: 'membership-singleton',
  };
}

