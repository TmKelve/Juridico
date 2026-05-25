import { TaskDomainError } from '../core/task-errors';
import type { CanonicalTaskStatus, LegacyTaskStatus, TaskStatusInput, TaskWorkflowStage } from '../core/task-types';

const legacyToCanonicalStatusMap: Record<LegacyTaskStatus, CanonicalTaskStatus> = {
  pendente: 'backlog',
  em_andamento: 'em_execucao',
  aguardando: 'aguardando_interno',
  concluida: 'concluida',
  atrasada: 'atrasada',
};

const canonicalToLegacyStatusMap: Record<CanonicalTaskStatus, LegacyTaskStatus> = {
  backlog: 'pendente',
  triagem: 'pendente',
  em_execucao: 'em_andamento',
  aguardando_cliente: 'aguardando',
  aguardando_interno: 'aguardando',
  concluida: 'concluida',
  cancelada: 'concluida',
  atrasada: 'atrasada',
};

export function normalizeTaskStatus(status: TaskStatusInput): CanonicalTaskStatus {
  if ((status as CanonicalTaskStatus) in canonicalToLegacyStatusMap) {
    return status as CanonicalTaskStatus;
  }

  if ((status as LegacyTaskStatus) in legacyToCanonicalStatusMap) {
    return legacyToCanonicalStatusMap[status as LegacyTaskStatus];
  }

  throw new TaskDomainError('Status da tarefa inválido', 400, 'TASK_INVALID', { status });
}

export function toLegacyTaskStatus(status: CanonicalTaskStatus): LegacyTaskStatus {
  return canonicalToLegacyStatusMap[status];
}

export function workflowStageToStatus(stage: TaskWorkflowStage): CanonicalTaskStatus {
  switch (stage) {
    case 'captura':
      return 'backlog';
    case 'planejamento':
      return 'triagem';
    case 'execucao':
      return 'em_execucao';
    case 'aguardando':
      return 'aguardando_interno';
    case 'conclusao':
      return 'em_execucao';
    default:
      throw new TaskDomainError('workflowStage inválido', 400, 'TASK_INVALID', { stage });
  }
}
