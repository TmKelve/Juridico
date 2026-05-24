import type {
  FinanceActor,
  FinanceAgingBucket,
  FinanceAuditEventPayload,
  FinanceCashflowPoint,
  FinanceChargePayload,
  FinanceDelinquencyContactPayload,
  FinanceEntryPayload,
  FinanceInstallmentPlanPayload,
} from './finance/shared';

type RawFinanceCategory = {
  code: string;
  label: string;
};

type RawFinanceEntry = {
  id: number;
  type: string;
  status: string;
  description: string;
  amountCents: number;
  settledAmountCents?: number | null;
  dueDate: Date;
  settlementDate?: Date | null;
  paymentMethod?: string | null;
  currency?: string | null;
  clientId?: number | null;
  clientRecord?: { id: number; name: string; email?: string | null; phone?: string | null } | null;
  processId?: number | null;
  process?: { id: number; title: string; processNumber?: string | null } | null;
  installmentPlanId?: number | null;
  installmentNumber?: number | null;
  categoryCode: string;
  category?: RawFinanceCategory | null;
  responsibleUserId?: number | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  charges?: Array<{ status: string; method: string }> | null;
};

type RawFinanceCharge = {
  id: number;
  entryId: number;
  method: string;
  status: string;
  provider: string;
  externalId: string;
  paymentUrl?: string | null;
  pixCode?: string | null;
  boletoBarcode?: string | null;
  expiresAt?: Date | null;
  paidAt?: Date | null;
  amountCents: number;
  createdAt: Date;
  updatedAt: Date;
};

type RawFinanceAuditEvent = {
  id: string;
  scope: string;
  entityType: string;
  entityId?: string | null;
  action: string;
  status: string;
  summary: string;
  details?: Record<string, unknown> | null;
  actor: FinanceActor;
  occurredAt: Date;
  correlationId?: string | null;
  idempotencyKey?: string | null;
  createdAt: Date;
};

export function buildFinanceEntryPayload(entry: RawFinanceEntry): FinanceEntryPayload {
  const latestCharge = entry.charges?.[0] ?? null;

  return {
    id: entry.id,
    type: entry.type as FinanceEntryPayload['type'],
    status: entry.status as FinanceEntryPayload['status'],
    description: entry.description,
    amountCents: entry.amountCents,
    settledAmountCents: entry.settledAmountCents ?? 0,
    dueDate: entry.dueDate.toISOString().slice(0, 10),
    settlementDate: entry.settlementDate ? entry.settlementDate.toISOString().slice(0, 10) : null,
    paymentMethod: (entry.paymentMethod ?? null) as FinanceEntryPayload['paymentMethod'],
    currency: entry.currency ?? 'BRL',
    clientId: entry.clientId ?? null,
    clientName: entry.clientRecord?.name ?? null,
    clientEmail: entry.clientRecord?.email ?? null,
    clientPhone: entry.clientRecord?.phone ?? null,
    processId: entry.processId ?? null,
    processTitle: entry.process?.title ?? null,
    processNumber: entry.process?.processNumber ?? null,
    categoryCode: entry.categoryCode,
    categoryLabel: entry.category?.label ?? entry.categoryCode,
    responsibleUserId: entry.responsibleUserId ?? null,
    installmentPlanId: entry.installmentPlanId ?? null,
    installmentNumber: entry.installmentNumber ?? null,
    installmentLabel: entry.installmentNumber ? `${entry.installmentNumber}a parcela` : null,
    chargeStatus: (latestCharge?.status ?? null) as FinanceEntryPayload['chargeStatus'],
    billingMethod: (latestCharge?.method ?? null) as FinanceEntryPayload['billingMethod'],
    notes: entry.notes ?? '',
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export function buildFinanceChargePayload(charge: RawFinanceCharge): FinanceChargePayload {
  return {
    id: charge.id,
    entryId: charge.entryId,
    method: charge.method as FinanceChargePayload['method'],
    status: charge.status as FinanceChargePayload['status'],
    provider: charge.provider,
    externalId: charge.externalId,
    paymentUrl: charge.paymentUrl ?? null,
    pixCode: charge.pixCode ?? null,
    boletoBarcode: charge.boletoBarcode ?? null,
    expiresAt: charge.expiresAt ? charge.expiresAt.toISOString() : null,
    paidAt: charge.paidAt ? charge.paidAt.toISOString() : null,
    amountCents: charge.amountCents,
    createdAt: charge.createdAt.toISOString(),
    updatedAt: charge.updatedAt.toISOString(),
  };
}

export function buildFinanceAuditEventPayload(event: RawFinanceAuditEvent): FinanceAuditEventPayload {
  return {
    id: event.id,
    scope: event.scope,
    entityType: event.entityType as FinanceAuditEventPayload['entityType'],
    entityId: event.entityId ?? null,
    action: event.action,
    status: event.status as FinanceAuditEventPayload['status'],
    summary: event.summary,
    details: event.details ?? {},
    actor: event.actor,
    occurredAt: event.occurredAt.toISOString(),
    correlationId: event.correlationId ?? null,
    idempotencyKey: event.idempotencyKey ?? null,
    createdAt: event.createdAt.toISOString(),
  };
}

export function buildFinanceCashflowPayload(points: FinanceCashflowPoint[]) {
  const totals = points.reduce(
    (acc, point) => {
      acc.inflowCents += point.inflowCents;
      acc.outflowCents += point.outflowCents;
      acc.netCents += point.netCents;
      return acc;
    },
    { inflowCents: 0, outflowCents: 0, netCents: 0 },
  );

  return {
    totals,
    series: points,
  };
}

export function buildFinanceAgingPayload(referenceDate: string, buckets: FinanceAgingBucket[]) {
  const summary = buckets.reduce(
    (acc, bucket) => {
      acc.totalCount += bucket.count;
      acc.totalAmountCents += bucket.amountCents;
      return acc;
    },
    { totalCount: 0, totalAmountCents: 0 },
  );

  return {
    referenceDate,
    buckets,
    summary,
  };
}

type RawFinanceInstallmentPlan = {
  id: number;
  description: string;
  clientId?: number | null;
  clientRecord?: { name: string; email?: string | null; phone?: string | null } | null;
  processId?: number | null;
  process?: { title: string; processNumber?: string | null } | null;
  categoryCode: string;
  installmentCount: number;
  installmentAmountCents: number;
  totalAmountCents: number;
  dueDay: number;
  firstDueDate: Date;
  active: boolean;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  entries?: Array<RawFinanceEntry> | null;
};

export function buildFinanceInstallmentPlanPayload(plan: RawFinanceInstallmentPlan): FinanceInstallmentPlanPayload {
  const entries = plan.entries ?? [];
  const paidInstallments = entries.filter((entry) => entry.status === 'paid' || entry.status === 'reconciled').length;
  const overdueInstallments = entries.filter((entry) => entry.status === 'overdue').length;
  const openInstallments = entries.filter((entry) => entry.status === 'open' || entry.status === 'partially_paid').length;
  const onTimeInstallments = entries.filter((entry) => entry.status === 'open').length;
  const remainingAmountCents = entries.reduce((acc, entry) => {
    if (entry.status === 'paid' || entry.status === 'reconciled') return acc;
    return acc + Math.max(0, entry.amountCents - (entry.settledAmountCents ?? 0));
  }, 0);
  const overdueAmountCents = entries.reduce((acc, entry) => {
    if (entry.status !== 'overdue') return acc;
    return acc + Math.max(0, entry.amountCents - (entry.settledAmountCents ?? 0));
  }, 0);
  const nextDueEntry = entries
    .filter((entry) => entry.status !== 'paid' && entry.status !== 'reconciled' && entry.status !== 'cancelled')
    .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime())[0];
  const status = overdueInstallments > 0
    ? 'defaulted'
    : paidInstallments === plan.installmentCount
      ? 'completed'
      : plan.active
        ? 'active'
        : 'cancelled';

  return {
    id: plan.id,
    contractLabel: plan.description,
    description: plan.description,
    clientId: plan.clientId ?? null,
    clientName: plan.clientRecord?.name ?? 'Cliente não vinculado',
    processId: plan.processId ?? null,
    processTitle: plan.process?.title ?? null,
    processNumber: plan.process?.processNumber ?? null,
    categoryCode: plan.categoryCode,
    dayOfMonth: plan.dueDay,
    status,
    installments: entries
      .sort((left, right) => (left.installmentNumber ?? 0) - (right.installmentNumber ?? 0))
      .map((entry) => ({
        entryId: entry.id,
        installmentNumber: entry.installmentNumber ?? 0,
        status: (entry.status === 'reconciled' ? 'paid' : entry.status) as FinanceInstallmentPlanPayload['installments'][number]['status'],
        amountCents: entry.amountCents,
        dueDate: entry.dueDate.toISOString().slice(0, 10),
        settlementDate: entry.settlementDate ? entry.settlementDate.toISOString().slice(0, 10) : null,
        chargeStatus: (entry.charges?.[0]?.status ?? null) as FinanceInstallmentPlanPayload['installments'][number]['chargeStatus'],
      })),
    metrics: {
      paidCount: paidInstallments,
      onTimeCount: onTimeInstallments,
      overdueCount: overdueInstallments,
      openCount: openInstallments,
      remainingCount: Math.max(0, plan.installmentCount - paidInstallments),
      overdueAmountCents,
      remainingAmountCents,
    },
    installmentCount: plan.installmentCount,
    installmentAmountCents: plan.installmentAmountCents,
    totalAmountCents: plan.totalAmountCents,
    firstDueDate: plan.firstDueDate.toISOString().slice(0, 10),
    nextDueDate: nextDueEntry ? nextDueEntry.dueDate.toISOString().slice(0, 10) : null,
    notes: plan.notes ?? '',
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export function buildFinanceDelinquencyContactPayload(input: FinanceDelinquencyContactPayload) {
  return input;
}
