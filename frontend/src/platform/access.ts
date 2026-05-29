export type CompanyStatus = 'active' | 'past_due' | 'grace_period' | 'read_only' | 'suspended' | 'cancelled';

export const BLOCKED_MUTATION_STATUSES: readonly CompanyStatus[] = [
  'read_only',
  'suspended',
  'cancelled',
] as const;

export function isMutationBlockedByStatus(status: CompanyStatus): boolean {
  return BLOCKED_MUTATION_STATUSES.includes(status);
}
