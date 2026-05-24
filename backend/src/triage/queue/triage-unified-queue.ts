import {
  resolveOperationalBucket,
} from '../core/triage-operational-state';
import {
  type TriageOperationalBucket,
  type TriageQueueItemSnapshot,
} from '../core/triage-operational-model';
import { prioritizeTriageItem } from './triage-prioritization';

const bucketWeight: Record<TriageOperationalBucket, number> = {
  fila_ativa: 500,
  revisao_manual: 400,
  fila_escalada: 450,
  backlog_adiado: 100,
  tratados: 0,
};

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
      sortWeight: bucketWeight[prioritized.operationalBucket] + prioritized.effectivePriorityScore,
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
