import type { SubscriptionStatus } from './subscription.types';

const transitionGraph: Record<SubscriptionStatus, readonly SubscriptionStatus[]> = {
  draft: ['checkout_pending', 'cancelled'],
  checkout_pending: ['active', 'cancelled'],
  active: ['past_due', 'grace_period', 'read_only', 'suspended', 'cancelled'],
  past_due: ['grace_period', 'active', 'read_only', 'suspended', 'cancelled'],
  grace_period: ['active', 'read_only', 'suspended', 'cancelled'],
  read_only: ['active', 'suspended', 'cancelled'],
  suspended: ['active', 'cancelled'],
  cancelled: [],
};

export function isValidSubscriptionTransition(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
  if (from === to) return true;
  return transitionGraph[from].includes(to);
}
