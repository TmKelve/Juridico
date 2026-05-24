export const financeEntryTypes = ['receivable', 'payable'] as const;
export const financeEntryStatuses = ['open', 'overdue', 'paid', 'cancelled', 'partially_paid', 'reconciled'] as const;
export const financeChargeMethods = ['boleto', 'pix', 'payment_link'] as const;
export const financeChargeStatuses = ['draft', 'pending', 'paid', 'failed', 'cancelled', 'expired'] as const;
export const financePaymentMethods = ['manual', 'pix', 'boleto', 'link', 'bank_transfer', 'cash'] as const;
export const financeReconciliationStatuses = ['pending', 'matched', 'partial', 'unmatched'] as const;
export const financeCollectionChannels = ['email', 'whatsapp', 'sms'] as const;
export const financeCollectionStatuses = ['scheduled', 'processing', 'sent', 'failed', 'cancelled'] as const;
export const financeAuditStatuses = ['success', 'warning', 'error'] as const;
export const financeAuditEntityTypes = ['entry', 'charge', 'reconciliation', 'collection', 'report', 'permission', 'installment_plan'] as const;
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
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  processId: number | null;
  processTitle?: string | null;
  processNumber?: string | null;
  categoryCode: string;
  categoryLabel: string;
  responsibleUserId: number | null;
  installmentPlanId?: number | null;
  installmentNumber?: number | null;
  installmentLabel?: string | null;
  chargeStatus: FinanceChargeStatus | null;
  billingMethod: FinanceChargeMethod | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceInstallmentPlanPayload {
  id: number;
  contractLabel: string;
  description: string;
  clientId: number | null;
  clientName: string;
  processId: number | null;
  processTitle: string | null;
  processNumber: string | null;
  categoryCode: string;
  dayOfMonth: number;
  status: 'draft' | 'active' | 'completed' | 'defaulted' | 'cancelled';
  installments: Array<{
    entryId: number | null;
    installmentNumber: number;
    status: 'scheduled' | 'open' | 'paid' | 'overdue' | 'cancelled' | 'partially_paid';
    amountCents: number;
    dueDate: string;
    settlementDate: string | null;
    chargeStatus: FinanceChargeStatus | null;
  }>;
  metrics: {
    paidCount: number;
    onTimeCount: number;
    overdueCount: number;
    openCount: number;
    remainingCount: number;
    overdueAmountCents: number;
    remainingAmountCents: number;
  };
  installmentCount: number;
  installmentAmountCents: number;
  totalAmountCents: number;
  firstDueDate: string;
  nextDueDate: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceDelinquencyContactPayload {
  id: string;
  clientId: number | null;
  clientName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  processId: number | null;
  processTitle: string | null;
  processNumber: string | null;
  overdueEntriesCount: number;
  overdueInstallmentsCount: number;
  overdueAmountCents: number;
  oldestDaysPastDue: number;
  nextActionAt: string | null;
  lastCollectionChannel: 'email' | 'whatsapp' | 'sms' | 'phone' | 'manual' | null;
  lastCollectionOutcome: 'sent' | 'delivered' | 'paid' | 'failed' | 'no_response' | null;
  entries: FinanceEntryPayload[];
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
