import type { ExecutiveMetricResult } from './executive-metric.types';

export function buildExecutiveMetricPayload(metric: ExecutiveMetricResult) {
  return {
    metricKey: metric.metricKey,
    label: metric.label,
    value: metric.value,
    delta: metric.delta,
    series: metric.series,
    definitionVersion: metric.definitionVersion,
    snapshotId: metric.snapshotId,
  };
}

export function buildExecutiveDashboardPayload(input: {
  dashboardKey: string;
  metrics: ExecutiveMetricResult[];
  snapshotId?: string | null;
  definitionsVersion: string;
}) {
  return {
    dashboardKey: input.dashboardKey,
    metrics: input.metrics.map(buildExecutiveMetricPayload),
    snapshotId: input.snapshotId ?? null,
    definitionsVersion: input.definitionsVersion,
  };
}
