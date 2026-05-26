export type ExecutiveMetricScopeType = 'global' | 'team' | 'portfolio' | 'user' | 'client';
export type ExecutiveMetricGroupBy = 'day' | 'week' | 'month' | 'quarter';

export interface ExecutiveMetricSeriesPoint {
  label: string;
  value: number;
}

export interface ExecutiveMetricResult {
  metricKey: string;
  label: string;
  value: number;
  delta: number | null;
  series: ExecutiveMetricSeriesPoint[];
  definitionVersion: string;
  snapshotId: string | null;
}

export interface ExecutiveMetricQuery {
  scopeType: ExecutiveMetricScopeType;
  scopeId: string | number | null;
  from: string;
  to: string;
  groupBy: ExecutiveMetricGroupBy;
  timezone: string;
  asOf?: string | null;
}
