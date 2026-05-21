import type {
  FinanceActor,
  FinanceAgingBucket,
  FinanceAuditEventPayload,
  FinanceCashflowPoint,
  FinanceChargePayload,
  FinanceEntryPayload,
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
  processId?: number | null;
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
    processId: entry.processId ?? null,
    categoryCode: entry.categoryCode,
    categoryLabel: entry.category?.label ?? entry.categoryCode,
    responsibleUserId: entry.responsibleUserId ?? null,
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
