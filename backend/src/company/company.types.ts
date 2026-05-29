export const COMPANY_STATUSES = ['active', 'grace_period', 'read_only', 'suspended', 'cancelled'] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

export interface CompanyRecord {
  id: number;
  name: string;
  slug: string;
  status: CompanyStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyMembershipRecord {
  id: number;
  companyId: number;
  userId: number;
  role: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyInput {
  name: string;
  slug: string;
  status?: CompanyStatus;
}

export interface UpdateCompanyStatusInput {
  companyId: number;
  status: CompanyStatus;
}

export interface CreateCompanyMembershipInput {
  companyId: number;
  userId: number;
  role: string;
  active?: boolean;
}

export interface UpdateCompanyMembershipRoleInput {
  companyId: number;
  userId: number;
  role: string;
}
