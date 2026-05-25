import {
  type TriageQueueItemSnapshot,
} from '../core/triage-operational-model';
import { prioritizeTriageItem } from './triage-prioritization';

export function rankUnifiedTriageQueue(params: {
  items: TriageQueueItemSnapshot[];
  now: Date;
}) {
  const ranked = params.items.map((item) => {
    const prioritized = prioritizeTriageItem({
      item,
      now: params.now,
    });

    return {
      ...item,
      operationalBucket: prioritized.operationalBucket,
      agingHours: prioritized.agingHours,
      breached: prioritized.breached,
      slaTargetAt: prioritized.slaTargetAt,
      effectivePriorityScore: prioritized.effectivePriorityScore,
      priorityLabel: prioritized.priorityLabel,
      priorityReasons: prioritized.priorityReasons,
      queueRank: 0,
      sortWeight: prioritized.sortWeight,
    };
  });

  ranked.sort((left, right) => {
    if (right.sortWeight !== left.sortWeight) return right.sortWeight - left.sortWeight;
    if (right.agingHours !== left.agingHours) return right.agingHours - left.agingHours;
    return left.id - right.id;
  });

  return ranked.map((item, index) => ({
    ...item,
    queueRank: index + 1,
  }));
}
