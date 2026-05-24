import { toDate, type TriageQueueType } from '../core/triage-operational-model';

const slaHoursByQueueType: Record<TriageQueueType, number> = {
  critica: 4,
  normal: 24,
  tratados: 72,
};

function roundHours(value: number) {
  return Math.round(value * 100) / 100;
}

export function computeTriageSla(params: {
  queueType: TriageQueueType;
  createdAt: Date | string;
  now: Date;
  postponeUntil?: Date | string | null;
  slaTargetAt?: Date | string | null;
}) {
  const createdAt = toDate(params.createdAt);
  const postponeUntil = params.postponeUntil ? new Date(params.postponeUntil) : null;
  const effectiveStart =
    postponeUntil && postponeUntil.getTime() > params.now.getTime()
      ? postponeUntil
      : postponeUntil && postponeUntil.getTime() > createdAt.getTime()
        ? postponeUntil
        : createdAt;

  const slaHours = slaHoursByQueueType[params.queueType] ?? slaHoursByQueueType.normal;
  const resolvedTarget = params.slaTargetAt ? new Date(params.slaTargetAt) : new Date(effectiveStart.getTime() + slaHours * 60 * 60 * 1000);
  const agingMs = Math.max(0, params.now.getTime() - effectiveStart.getTime());
  const agingHours = roundHours(agingMs / (60 * 60 * 1000));

  return {
    slaHours,
    agingHours,
    slaTargetAt: resolvedTarget.toISOString(),
    breached: params.now.getTime() > resolvedTarget.getTime(),
  };
}
