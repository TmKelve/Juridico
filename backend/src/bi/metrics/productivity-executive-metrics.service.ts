import type { ExecutiveMetricQuery, ExecutiveMetricResult } from '../models/executive-metric.types';

export type ProductivitySnapshotInput = {
  referenceDate: string;
  tasksCompleted: number;
  tasksOverdue: number;
  attendancesHandled: number;
  avgResolutionHours: number | null;
};

export class ProductivityExecutiveMetricsService {
  buildMetrics(query: ExecutiveMetricQuery, snapshots: ProductivitySnapshotInput[]): ExecutiveMetricResult[] {
    const ordered = [...snapshots].sort((left, right) => left.referenceDate.localeCompare(right.referenceDate));
    const totals = ordered.reduce(
      (acc, item) => {
        acc.tasksCompleted += item.tasksCompleted;
        acc.tasksOverdue += item.tasksOverdue;
        acc.attendancesHandled += item.attendancesHandled;
        if (typeof item.avgResolutionHours === 'number') {
          acc.avgResolutionHoursSum += item.avgResolutionHours;
          acc.avgResolutionHoursCount += 1;
        }
        return acc;
      },
      { tasksCompleted: 0, tasksOverdue: 0, attendancesHandled: 0, avgResolutionHoursSum: 0, avgResolutionHoursCount: 0 },
    );

    const averageResolution = totals.avgResolutionHoursCount
      ? Number((totals.avgResolutionHoursSum / totals.avgResolutionHoursCount).toFixed(2))
      : 0;

    return [
      {
        metricKey: 'productivity.tasks.completed',
        label: 'Tarefas concluídas',
        value: totals.tasksCompleted,
        delta: null,
        series: ordered.map((item) => ({ label: item.referenceDate, value: item.tasksCompleted })),
        definitionVersion: 'l-v1',
        snapshotId: null,
      },
      {
        metricKey: 'productivity.tasks.overdue',
        label: 'Tarefas em atraso',
        value: totals.tasksOverdue,
        delta: null,
        series: ordered.map((item) => ({ label: item.referenceDate, value: item.tasksOverdue })),
        definitionVersion: 'l-v1',
        snapshotId: null,
      },
      {
        metricKey: 'productivity.attendances.handled',
        label: 'Atendimentos tratados',
        value: totals.attendancesHandled,
        delta: null,
        series: ordered.map((item) => ({ label: item.referenceDate, value: item.attendancesHandled })),
        definitionVersion: 'l-v1',
        snapshotId: null,
      },
      {
        metricKey: 'productivity.avg.resolution_hours',
        label: 'Tempo médio de resolução',
        value: averageResolution,
        delta: null,
        series: ordered.map((item) => ({ label: item.referenceDate, value: item.avgResolutionHours ?? 0 })),
        definitionVersion: 'l-v1',
        snapshotId: null,
      },
    ];
  }
}
