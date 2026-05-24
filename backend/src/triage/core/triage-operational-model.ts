export type TriageQueueType = 'critica' | 'normal' | 'tratados';

export type TriageOperationalStatus =
  | 'pendente'
  | 'em_revisao_manual'
  | 'confirmado'
  | 'descartado'
  | 'adiado'
  | 'escalado';

export type TriageDecisionType = 'confirmado' | 'descartado' | 'adiado' | 'revisao_manual' | 'escalado';

export type TriagePriorityLabel = 'critica' | 'alta' | 'media' | 'baixa';

export type TriageOperationalBucket =
  | 'fila_ativa'
  | 'revisao_manual'
  | 'fila_escalada'
  | 'backlog_adiado'
  | 'tratados';

export type TriageQueueItemSnapshot = {
  id: number;
  queueType: TriageQueueType;
  status: TriageOperationalStatus;
  createdAt: Date | string;
  priorityScore: number;
  priorityReasons?: string[];
  sourceType: string;
  postponeUntil?: Date | string | null;
  slaTargetAt?: Date | string | null;
};

export function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}
