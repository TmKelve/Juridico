import { resolveOperationalBucket } from '../core/triage-operational-state';
import {
  type TriageOperationalBucket,
  type TriagePriorityLabel,
  type TriageQueueItemSnapshot,
} from '../core/triage-operational-model';
import { computeTriageSla } from '../sla/triage-sla';

export const TRIAGE_ITEM_PRIORITIZE = 'triage.item.prioritize';

const operationalBucketWeight: Record<TriageOperationalBucket, number> = {
  fila_ativa: 500,
  revisao_manual: 400,
  fila_escalada: 560,
  backlog_adiado: 100,
  tratados: 0,
};

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
  const escalationBoost = params.operationalBucket === 'fila_escalada' ? 12 : 0;
  const bucketPenalty = params.operationalBucket === 'backlog_adiado' ? -60 : params.operationalBucket === 'tratados' ? -120 : 0;
  return params.baseScore + queueBoost + breachBoost + agingBoost + escalationBoost + bucketPenalty;
}

export function resolvePriorityLabel(score: number): TriagePriorityLabel {
  if (score >= 95) return 'critica';
  if (score >= 75) return 'alta';
  if (score >= 45) return 'media';
  return 'baixa';
}

export function triageItemPrioritize(params: {
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
    status: params.item.status,
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
  if (operationalBucket === 'fila_escalada') priorityReasons.push('state:escalado');
  if (operationalBucket === 'backlog_adiado') priorityReasons.push('state:postponed');

  return {
    workflow: TRIAGE_ITEM_PRIORITIZE,
    triageItemId: params.item.id,
    effectivePriorityScore,
    priorityLabel: resolvePriorityLabel(effectivePriorityScore),
    priorityReasons,
    agingHours: sla.agingHours,
    breached: sla.breached,
    slaProfile: sla.slaProfile,
    slaTargetAt: sla.slaTargetAt,
    operationalBucket,
    sortWeight: operationalBucketWeight[operationalBucket] + effectivePriorityScore,
  };
}
