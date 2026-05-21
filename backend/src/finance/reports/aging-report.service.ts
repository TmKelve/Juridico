import { buildAgingSnapshot, buildDelinquencyIndicators } from '../delinquency/aging.service';

export class FinanceAgingReportService {
  build(input: {
    referenceDate: string;
    bucketMode: 'default_4';
    entries: Array<{ type: string; status: string; amountCents: number; settledAmountCents?: number; dueDate: string }>;
  }) {
    const snapshot = buildAgingSnapshot(input.entries, input.referenceDate);
    const indicators = buildDelinquencyIndicators(input.entries, input.referenceDate);
    return {
      referenceDate: input.referenceDate,
      buckets: snapshot.buckets,
      summary: snapshot.summary,
      indicators,
    };
  }
}
