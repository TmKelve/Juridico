import { resolveOperationalBucket } from '../core/triage-operational-state';
import {
  type TriageOperationalBucket,
  type TriagePriorityLabel,
  type TriageQueueItemSnapshot,
} from '../core/triage-operational-model';
import { computeTriageSla } from '../sla/triage-sla';

export function computeDynamicPriorityScore(params: {
  baseScore: number;
  queueType: TriageQueueItemSnapshot['queueType'];
  breached: boolean;
  operationalBucket: TriageOperationalBucket;
  agingHours: number;
}) {
  const queueBoost = params.queueType === 'critica' ? 15 : params.queueType === 'tratados' ? -25 : 0;
  const breachBoost = params.breached ? 10 : 0;
  const agingBoost = Math.min(12, Math.floor(params.agingHours));
  const bucketPenalty = params.operationalBucket === 'backlog_adiado' ? -60 : params.operationalBucket === 'tratados' ? -120 : 0;
  return params.baseScore + queueBoost + breachBoost + agingBoost + bucketPenalty;
}

export function resolvePriorityLabel(score: number): TriagePriorityLabel {
  if (score >= 95) return 'critica';
  if (score >= 75) return 'alta';
  if (score >= 45) return 'media';
  return 'baixa';
}

export function prioritizeTriageItem(params: {
  item: TriageQueueItemSnapshot;
  now: Date;
}) {
  const operationalBucket = resolveOperationalBucket({
    status: params.item.status,
    postponeUntil: params.item.postponeUntil ?? null,
    now: params.now,
  });
  const sla = computeTriageSla({
    queueType: params.item.queueType,
    createdAt: params.item.createdAt,
    now: params.now,
    postponeUntil: params.item.postponeUntil ?? null,
    slaTargetAt: params.item.slaTargetAt ?? null,
  });
  const effectivePriorityScore = computeDynamicPriorityScore({
    baseScore: params.item.priorityScore,
    queueType: params.item.queueType,
    breached: sla.breached,
    operationalBucket,
    agingHours: sla.agingHours,
  });

  const priorityReasons = [...(params.item.priorityReasons ?? [])];
  priorityReasons.push(`queue:${params.item.queueType}`);
  if (sla.breached) priorityReasons.push('sla:breached');
  if (operationalBucket === 'backlog_adiado') priorityReasons.push('state:postponed');

  return {
    triageItemId: params.item.id,
    effectivePriorityScore,
    priorityLabel: resolvePriorityLabel(effectivePriorityScore),
    priorityReasons,
    agingHours: sla.agingHours,
    breached: sla.breached,
    slaTargetAt: sla.slaTargetAt,
    operationalBucket,
  };
}
