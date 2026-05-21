export class FinanceCashflowReportService {
  build(input: {
    from: string;
    to: string;
    groupBy: 'day' | 'week' | 'month';
    entries: Array<{
      type: string;
      amountCents: number;
      settledAmountCents?: number;
      dueDate: string;
      settlementDate: string | null;
    }>;
  }) {
    const groups = new Map<string, { date: string; inflowCents: number; outflowCents: number; netCents: number }>();
    const dateFor = (value: string) => {
      if (input.groupBy === 'day') return value;
      if (input.groupBy === 'month') return value.slice(0, 7);
      const date = new Date(`${value}T00:00:00.000Z`);
      const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      const week = Math.ceil((((date.getTime() - start.getTime()) / 86400000) + start.getUTCDay() + 1) / 7);
      return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
    };

    for (const entry of input.entries) {
      const key = dateFor(entry.settlementDate ?? entry.dueDate);
      const current = groups.get(key) ?? { date: key, inflowCents: 0, outflowCents: 0, netCents: 0 };
      if (entry.type === 'receivable') current.inflowCents += entry.amountCents;
      else current.outflowCents += entry.amountCents;
      current.netCents = current.inflowCents - current.outflowCents;
      groups.set(key, current);
    }

    const series = [...groups.values()].sort((left, right) => left.date.localeCompare(right.date));
    return {
      totals: {
        inflowCents: series.reduce((acc, point) => acc + point.inflowCents, 0),
        outflowCents: series.reduce((acc, point) => acc + point.outflowCents, 0),
        netCents: series.reduce((acc, point) => acc + point.netCents, 0),
      },
      series,
    };
  }
}
