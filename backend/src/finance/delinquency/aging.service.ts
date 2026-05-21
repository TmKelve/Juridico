function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function remainingAmount(entry: { amountCents: number; settledAmountCents?: number }) {
  return Math.max(0, entry.amountCents - (entry.settledAmountCents ?? 0));
}

function daysPastDue(dueDate: string, referenceDate: string) {
  const ms = parseDateOnly(referenceDate).getTime() - parseDateOnly(dueDate).getTime();
  return Math.floor(ms / 86400000);
}

export function buildAgingSnapshot(entries: Array<{ type: string; status: string; amountCents: number; settledAmountCents?: number; dueDate: string }>, referenceDate: string) {
  const buckets = [
    { label: '0-30' as const, count: 0, amountCents: 0 },
    { label: '31-60' as const, count: 0, amountCents: 0 },
    { label: '61-90' as const, count: 0, amountCents: 0 },
    { label: '90+' as const, count: 0, amountCents: 0 },
  ];

  for (const entry of entries) {
    if (entry.type !== 'receivable' || entry.status === 'paid' || entry.status === 'cancelled') continue;
    const overdueDays = daysPastDue(entry.dueDate, referenceDate);
    if (overdueDays <= 0) continue;
    const amount = remainingAmount(entry);
    const bucket = overdueDays <= 30
      ? buckets[0]
      : overdueDays <= 60
        ? buckets[1]
        : overdueDays <= 90
          ? buckets[2]
          : buckets[3];
    bucket.count += 1;
    bucket.amountCents += amount;
  }

  return {
    referenceDate,
    buckets,
    summary: {
      totalCount: buckets.reduce((acc, bucket) => acc + bucket.count, 0),
      totalAmountCents: buckets.reduce((acc, bucket) => acc + bucket.amountCents, 0),
    },
  };
}

export function buildDelinquencyIndicators(entries: Array<{ type: string; status: string; amountCents: number; settledAmountCents?: number; dueDate: string }>, referenceDate: string) {
  const receivables = entries.filter((entry) => entry.type === 'receivable' && !['paid', 'cancelled'].includes(entry.status));
  const totalReceivablesCents = receivables.reduce((acc, entry) => acc + entry.amountCents, 0);
  const overdue = receivables.filter((entry) => entry.status !== 'paid' && daysPastDue(entry.dueDate, referenceDate) > 0);
  const overdueAmountCents = overdue.reduce((acc, entry) => acc + remainingAmount(entry), 0);
  const oldestDaysPastDue = overdue.reduce((acc, entry) => Math.max(acc, daysPastDue(entry.dueDate, referenceDate)), 0);

  return {
    totalReceivablesCents,
    overdueAmountCents,
    overdueCount: overdue.length,
    currentAmountCents: Math.max(0, totalReceivablesCents - overdueAmountCents),
    oldestDaysPastDue,
    overdueRatePercent: totalReceivablesCents === 0 ? 0 : Number(((overdueAmountCents / totalReceivablesCents) * 100).toFixed(2)),
  };
}
