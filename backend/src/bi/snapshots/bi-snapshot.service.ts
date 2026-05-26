import { randomUUID } from 'crypto';
import type { ExecutiveMetricResult } from '../models/executive-metric.types';

export type BiSnapshotRecord = {
  id: string;
  metricKey: string;
  scopeType: string;
  scopeId: string;
  referenceDate: string;
  windowFrom: string;
  windowTo: string;
  value: number;
  definitionVersion: string;
  generatedBy: string;
  createdAt: string;
};

export class InMemoryBiSnapshotService {
  private readonly snapshots: BiSnapshotRecord[] = [];

  async store(input: {
    metrics: ExecutiveMetricResult[];
    scopeType: string;
    scopeId: string;
    referenceDate: string;
    windowFrom: string;
    windowTo: string;
    generatedBy: string;
  }) {
    const createdAt = new Date().toISOString();
    const created = input.metrics.map((metric) => ({
      id: randomUUID(),
      metricKey: metric.metricKey,
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      referenceDate: input.referenceDate,
      windowFrom: input.windowFrom,
      windowTo: input.windowTo,
      value: metric.value,
      definitionVersion: metric.definitionVersion,
      generatedBy: input.generatedBy,
      createdAt,
    }));

    this.snapshots.push(...created);
    return created;
  }

  async list(metricKey?: string) {
    return metricKey
      ? this.snapshots.filter((item) => item.metricKey === metricKey)
      : [...this.snapshots];
  }
}
