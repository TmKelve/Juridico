export const COMPANY_STATUSES = ['active', 'grace_period', 'read_only', 'suspended', 'cancelled'] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];
