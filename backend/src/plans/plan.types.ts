export interface PlanRecord {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  priceCents: number;
  currency: string;
  billingCycle: string;
  active: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanInput {
  code: string;
  name: string;
  description?: string;
  priceCents: number;
  currency?: string;
  billingCycle?: string;
  active?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdatePlanInput {
  planId: number;
  name?: string;
  description?: string;
  priceCents?: number;
  currency?: string;
  billingCycle?: string;
  active?: boolean;
  metadata?: Record<string, unknown>;
}
