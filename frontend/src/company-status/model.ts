import type { CompanyStatus } from '../platform/access';

export type SubscriptionSummary = {
  id: number;
  planName: string;
  status: string;
  periodEnd?: string | null;
};

export function normalizeCompanyStatus(input: unknown): CompanyStatus {
  const status = typeof input === 'string' ? input : 'active';
  if (status === 'grace_period' || status === 'read_only' || status === 'suspended' || status === 'cancelled') {
    return status;
  }
  return 'active';
}
