import { normalizeTaskStatus, workflowStageToStatus } from '../integrations/task-frontend-status.adapter';
import { TaskDomainError } from './task-errors';
import type { CanonicalTaskStatus, TaskStatusInput, TaskWorkflowStage } from './task-types';

const transitions: Record<CanonicalTaskStatus, CanonicalTaskStatus[]> = {
  backlog: ['triagem', 'em_execucao', 'aguardando_interno', 'cancelada', 'atrasada'],
  triagem: ['em_execucao', 'aguardando_cliente', 'aguardando_interno', 'cancelada', 'atrasada'],
  em_execucao: ['triagem', 'aguardando_cliente', 'aguardando_interno', 'concluida', 'cancelada', 'atrasada'],
  aguardando_cliente: ['em_execucao', 'aguardando_interno', 'concluida', 'cancelada', 'atrasada'],
  aguardando_interno: ['em_execucao', 'aguardando_cliente', 'concluida', 'cancelada', 'atrasada'],
  concluida: [],
  cancelada: [],
  atrasada: ['em_execucao', 'aguardando_cliente', 'aguardando_interno', 'concluida', 'cancelada'],
};

export function isTerminalTaskStatus(status: CanonicalTaskStatus) {
  return status === 'concluida' || status === 'cancelada';
}

export function resolveTaskStatusFromWorkflow(stage: TaskWorkflowStage, dueDate: string | null, now = new Date()) {
  const base = workflowStageToStatus(stage);
  return applyOverdueStatus(base, dueDate, now);
}

export function applyOverdueStatus(status: CanonicalTaskStatus, dueDate: string | null, now = new Date()) {
  if (isTerminalTaskStatus(status) || !dueDate) return status;
  const dueAt = new Date(`${dueDate}T23:59:59.999Z`);
  if (Number.isNaN(dueAt.getTime())) {
    throw new TaskDomainError('dueDate inválida', 400, 'TASK_INVALID', { dueDate });
  }
  return dueAt.getTime() < now.getTime() ? 'atrasada' : status;
}

export function assertTaskTransition(currentStatusInput: TaskStatusInput, nextStatusInput: TaskStatusInput) {
  const current = normalizeTaskStatus(currentStatusInput);
  const next = normalizeTaskStatus(nextStatusInput);

  if (current === next) return { current, next };
  if (!transitions[current].includes(next)) {
    throw new TaskDomainError('Transição kanban inválida para a tarefa', 409, 'TASK_TRANSITION_INVALID', {
      currentStatus: current,
      nextStatus: next,
    });
  }

  return { current, next };
}
