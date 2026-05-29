export const SUBSCRIPTION_STATUSES = [
  'draft',
  'checkout_pending',
  'active',
  'past_due',
  'grace_period',
  'read_only',
  'suspended',
  'cancelled',
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export interface SubscriptionRecord {
  id: number;
  companyId: number;
  planId: number;
  status: SubscriptionStatus;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  checkoutReference?: string | null;
  externalReference?: string | null;
  cancelledAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionTransitionRecord {
  id: number;
  subscriptionId: number;
  fromStatus: SubscriptionStatus;
  toStatus: SubscriptionStatus;
  reason?: string;
  actor?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CreateSubscriptionInput {
  companyId: number;
  planId: number;
  status?: SubscriptionStatus;
  checkoutReference?: string;
  externalReference?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  metadata?: Record<string, unknown>;
}

export interface TransitionSubscriptionInput {
  subscriptionId: number;
  toStatus: SubscriptionStatus;
  reason?: string;
  actor?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface TransitionSubscriptionResult {
  subscription: SubscriptionRecord;
  transition: SubscriptionTransitionRecord;
  companyStatus: string;
  idempotentReplay: boolean;
}
