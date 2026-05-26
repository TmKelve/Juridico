import type { ExecutiveMetricQuery, ExecutiveMetricResult } from '../models/executive-metric.types';

export type FinanceMetricInput = {
  referenceDate: string;
  receivablesOpenCents: number;
  receivablesOverdueCents: number;
  payablesOpenCents: number;
  cashflowNetCents: number;
};

export class FinanceExecutiveMetricsService {
  buildMetrics(query: ExecutiveMetricQuery, items: FinanceMetricInput[]): ExecutiveMetricResult[] {
    const ordered = [...items].sort((left, right) => left.referenceDate.localeCompare(right.referenceDate));
    const total = ordered.reduce(
      (acc, item) => {
        acc.receivablesOpenCents += item.receivablesOpenCents;
        acc.receivablesOverdueCents += item.receivablesOverdueCents;
        acc.payablesOpenCents += item.payablesOpenCents;
        acc.cashflowNetCents += item.cashflowNetCents;
        return acc;
      },
      { receivablesOpenCents: 0, receivablesOverdueCents: 0, payablesOpenCents: 0, cashflowNetCents: 0 },
    );

    return [
      {
        metricKey: 'finance.receivables.open_cents',
        label: 'Recebíveis em aberto',
        value: total.receivablesOpenCents,
        delta: null,
        series: ordered.map((item) => ({ label: item.referenceDate, value: item.receivablesOpenCents })),
        definitionVersion: 'l-v1',
        snapshotId: null,
      },
      {
        metricKey: 'finance.receivables.overdue_cents',
        label: 'Recebíveis vencidos',
        value: total.receivablesOverdueCents,
        delta: null,
        series: ordered.map((item) => ({ label: item.referenceDate, value: item.receivablesOverdueCents })),
        definitionVersion: 'l-v1',
        snapshotId: null,
      },
      {
        metricKey: 'finance.payables.open_cents',
        label: 'Pagáveis em aberto',
        value: total.payablesOpenCents,
        delta: null,
        series: ordered.map((item) => ({ label: item.referenceDate, value: item.payablesOpenCents })),
        definitionVersion: 'l-v1',
        snapshotId: null,
      },
      {
        metricKey: 'finance.cashflow.net_cents',
        label: 'Fluxo líquido',
        value: total.cashflowNetCents,
        delta: null,
        series: ordered.map((item) => ({ label: item.referenceDate, value: item.cashflowNetCents })),
        definitionVersion: 'l-v1',
        snapshotId: null,
      },
    ];
  }
}
