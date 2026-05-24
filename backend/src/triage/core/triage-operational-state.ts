import { type TriageDecisionType, type TriageOperationalBucket, type TriageOperationalStatus } from './triage-operational-model';

const allowedTransitions: Record<TriageOperationalStatus, TriageDecisionType[]> = {
  pendente: ['confirmado', 'descartado', 'adiado', 'revisao_manual', 'escalado'],
  em_revisao_manual: ['confirmado', 'descartado', 'adiado', 'escalado'],
  adiado: ['confirmado', 'descartado', 'revisao_manual', 'escalado'],
  escalado: ['confirmado', 'descartado', 'adiado', 'revisao_manual'],
  confirmado: [],
  descartado: [],
};

function resolveStatus(nextDecisionType: TriageDecisionType): TriageOperationalStatus {
  if (nextDecisionType === 'revisao_manual') return 'em_revisao_manual';
  return nextDecisionType;
}

export function resolveOperationalBucket(params: {
  status: TriageOperationalStatus;
  postponeUntil?: Date | string | null;
  now: Date;
}): TriageOperationalBucket {
  const postponeUntil = params.postponeUntil ? new Date(params.postponeUntil) : null;

  if (params.status === 'confirmado' || params.status === 'descartado') return 'tratados';
  if (params.status === 'em_revisao_manual') return 'revisao_manual';
  if (params.status === 'escalado') return 'fila_escalada';
  if (params.status === 'adiado' && postponeUntil && postponeUntil.getTime() > params.now.getTime()) return 'backlog_adiado';
  return 'fila_ativa';
}

export function transitionTriageOperationalState(params: {
  currentStatus: TriageOperationalStatus;
  nextDecisionType: TriageDecisionType;
  actor: string;
  now: Date;
  assignedQueue?: string | null;
  postponeUntil?: string | null;
}) {
  const allowed = allowedTransitions[params.currentStatus] ?? [];
  if (!allowed.includes(params.nextDecisionType)) {
    throw new Error(`TRIAGE_STATE_INVALID: ${params.currentStatus} -> ${params.nextDecisionType}`);
  }

  const status = resolveStatus(params.nextDecisionType);

  return {
    status,
    assignedQueue: params.assignedQueue ?? null,
    postponeUntil: params.postponeUntil ?? null,
    handledBy: params.actor,
    handledAt: params.now.toISOString(),
    operationalBucket: resolveOperationalBucket({
      status,
      postponeUntil: params.postponeUntil ?? null,
      now: params.now,
    }),
  };
}
