export const financeEntryTypes = ['receivable', 'payable'] as const;
export const financeEntryStatuses = ['open', 'overdue', 'paid', 'cancelled', 'partially_paid', 'reconciled'] as const;
export const financeChargeMethods = ['boleto', 'pix', 'payment_link'] as const;
export const financeChargeStatuses = ['draft', 'pending', 'paid', 'failed', 'cancelled', 'expired'] as const;
export const financePaymentMethods = ['manual', 'pix', 'boleto', 'link', 'bank_transfer', 'cash'] as const;
export const financeReconciliationStatuses = ['pending', 'matched', 'partial', 'unmatched'] as const;
export const financeCollectionChannels = ['email', 'whatsapp', 'sms'] as const;
export const financeCollectionStatuses = ['scheduled', 'processing', 'sent', 'failed', 'cancelled'] as const;
export const financeAuditStatuses = ['success', 'warning', 'error'] as const;
export const financeAuditEntityTypes = ['entry', 'charge', 'reconciliation', 'collection', 'report', 'permission'] as const;
export const financePermissions = [
  'finance:view',
  'finance:entry',
  'finance:billing',
  'finance:settlement',
  'finance:reconciliation',
  'finance:export',
] as const;

export type FinanceEntryType = typeof financeEntryTypes[number];
export type FinanceEntryStatus = typeof financeEntryStatuses[number];
export type FinanceChargeMethod = typeof financeChargeMethods[number];
export type FinanceChargeStatus = typeof financeChargeStatuses[number];
export type FinancePaymentMethod = typeof financePaymentMethods[number];
export type FinanceReconciliationStatus = typeof financeReconciliationStatuses[number];
export type FinanceCollectionChannel = typeof financeCollectionChannels[number];
export type FinanceCollectionStatus = typeof financeCollectionStatuses[number];
export type FinanceAuditStatus = typeof financeAuditStatuses[number];
export type FinanceAuditEntityType = typeof financeAuditEntityTypes[number];
export type FinancePermission = typeof financePermissions[number];

export interface FinanceActor {
  source: 'user' | 'system' | 'api';
  userId?: number | null;
  email?: string | null;
  role?: string | null;
}

export interface FinanceEntryPayload {
  id: number;
  type: FinanceEntryType;
  status: FinanceEntryStatus;
  description: string;
  amountCents: number;
  settledAmountCents: number;
  dueDate: string;
  settlementDate: string | null;
  paymentMethod: FinancePaymentMethod | null;
  currency: string;
  clientId: number | null;
  processId: number | null;
  categoryCode: string;
  categoryLabel: string;
  responsibleUserId: number | null;
  chargeStatus: FinanceChargeStatus | null;
  billingMethod: FinanceChargeMethod | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceChargePayload {
  id: number;
  entryId: number;
  method: FinanceChargeMethod;
  status: FinanceChargeStatus;
  provider: string;
  externalId: string;
  paymentUrl: string | null;
  pixCode: string | null;
  boletoBarcode: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  amountCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceAuditEventPayload {
  id: string;
  scope: string;
  entityType: FinanceAuditEntityType;
  entityId: string | null;
  action: string;
  status: FinanceAuditStatus;
  summary: string;
  details: Record<string, unknown>;
  actor: FinanceActor;
  occurredAt: string;
  correlationId: string | null;
  idempotencyKey: string | null;
  createdAt: string;
}

export interface FinanceAgingBucket {
  label: '0-30' | '31-60' | '61-90' | '90+';
  count: number;
  amountCents: number;
}

export interface FinanceCashflowPoint {
  date: string;
  inflowCents: number;
  outflowCents: number;
  netCents: number;
}
