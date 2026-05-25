import {
  buildAttendanceAuditEvent,
  normalizeAttendancePriority,
  requireNonEmptyString,
  resolveAttendanceConversionState,
  type AttendanceAggregate,
  type AttendancePriority,
  type AttendancePriorityInput,
} from '../core/attendance.model';

type TaskAggregate = {
  taskId: number;
  title: string;
  description: string;
  status: 'backlog' | 'triagem' | 'em_execucao' | 'aguardando_cliente' | 'aguardando_interno' | 'concluida' | 'cancelada' | 'atrasada';
  priority: 'baixa' | 'media' | 'alta' | 'critica';
  dueDate: string | null;
  slaDueAt: string | null;
  ownerUserId: number | null;
  ownerLabel: string;
  portfolioId: number | null;
  teamId: number | null;
  linkedEntities: Array<{ entityType: 'attendance'; entityId: number }>;
  workflowStage: 'captura' | 'planejamento' | 'execucao' | 'aguardando' | 'conclusao';
  breached: boolean;
  followupState: 'idle' | 'scheduled' | 'pending_dispatch' | 'dispatched' | 'acknowledged';
  createdByUserId: number | null;
  createdAt: string;
  updatedAt: string;
  processId: number | null;
  clientId: number | null;
  origin: 'atendimento';
  notes: string | null;
};

function normalizeTaskPriority(priority: AttendancePriorityInput | null | undefined) {
  return normalizeAttendancePriority(priority) as TaskAggregate['priority'];
}

function normalizeDeadlinePriority(priority: AttendancePriorityInput | null | undefined): 'baixa' | 'media' | 'alta' {
  const normalized = normalizeAttendancePriority(priority);
  if (normalized === 'critica') return 'alta';
  return normalized;
}

function updateConversionState(attendance: AttendanceAggregate, patch: {
  derivedTaskId?: number | null;
  derivedDeadlineId?: number | null;
  updatedAt: string;
}) {
  const next = {
    ...attendance,
    derivedTaskId: patch.derivedTaskId ?? attendance.derivedTaskId,
    derivedDeadlineId: patch.derivedDeadlineId ?? attendance.derivedDeadlineId,
    updatedAt: patch.updatedAt,
  };

  return {
    ...next,
    conversionState: resolveAttendanceConversionState({
      processId: next.processId,
      status: next.status,
      derivedTaskId: next.derivedTaskId,
      derivedDeadlineId: next.derivedDeadlineId,
    }),
  };
}

export function convertAttendanceToTask(input: {
  attendance: AttendanceAggregate;
  taskId: number;
  title: string;
  dueDate: string | null;
  priority?: AttendancePriorityInput | null;
  ownerUserId: number | null;
  actorUserId: number;
  idempotencyKey?: string | null;
  now: Date;
}) {
  const updatedAt = input.now.toISOString();
  const attendance = updateConversionState(input.attendance, {
    derivedTaskId: input.taskId,
    updatedAt,
  });
  const task: TaskAggregate = {
    taskId: input.taskId,
    title: requireNonEmptyString('title', input.title),
    description: input.attendance.summary || input.attendance.subject,
    status: 'triagem',
    priority: normalizeTaskPriority(input.priority ?? input.attendance.priority),
    dueDate: input.dueDate,
    slaDueAt: input.attendance.slaTargetAt,
    ownerUserId: input.ownerUserId ?? input.attendance.ownerUserId,
    ownerLabel: input.ownerUserId ?? input.attendance.ownerUserId ? `user:${input.ownerUserId ?? input.attendance.ownerUserId}` : 'sem-responsavel',
    portfolioId: input.attendance.portfolioId,
    teamId: input.attendance.teamId,
    linkedEntities: [{ entityType: 'attendance', entityId: input.attendance.attendanceId }],
    workflowStage: 'planejamento',
    breached: input.attendance.slaBreached,
    followupState: 'idle',
    createdByUserId: input.actorUserId,
    createdAt: updatedAt,
    updatedAt,
    processId: input.attendance.processId,
    clientId: input.attendance.clientId,
    origin: 'atendimento',
    notes: input.attendance.notes,
  };

  return {
    attendance,
    task,
    taskPayload: {
      title: task.title,
      description: task.description,
      processId: task.processId,
      clientId: task.clientId,
      origin: task.origin,
      ownerUserId: task.ownerUserId,
      portfolioId: task.portfolioId,
      priority: task.priority,
      dueDate: task.dueDate,
      workflowStage: task.workflowStage,
      linkedEntities: task.linkedEntities,
      notes: task.notes,
    },
    auditEvent: buildAttendanceAuditEvent({
      action: 'attendance.convertToTask',
      attendanceId: attendance.attendanceId,
      actorUserId: input.actorUserId,
      occurredAt: updatedAt,
      context: {
        taskId: task.taskId,
        priority: task.priority,
        dueDate: task.dueDate,
      },
      diff: {
        before: {
          conversionState: input.attendance.conversionState,
          derivedTaskId: input.attendance.derivedTaskId,
        },
        after: {
          conversionState: attendance.conversionState,
          derivedTaskId: attendance.derivedTaskId,
        },
      },
      idempotencyKey: input.idempotencyKey ?? null,
    }),
  };
}

export function convertAttendanceToDeadline(input: {
  attendance: AttendanceAggregate;
  deadlineId: number;
  title: string;
  dueDate: string;
  priority?: AttendancePriorityInput | null;
  responsible: string | null;
  actorUserId: number;
  idempotencyKey?: string | null;
  now: Date;
}) {
  if (!input.attendance.processId) {
    throw new Error('DEADLINE_PROCESS_REQUIRED: atendimento sem processo vinculado.');
  }

  const updatedAt = input.now.toISOString();
  const attendance = updateConversionState(input.attendance, {
    derivedDeadlineId: input.deadlineId,
    updatedAt,
  });
  const deadlinePriority = normalizeDeadlinePriority(input.priority ?? input.attendance.priority);

  return {
    attendance,
    deadlineId: input.deadlineId,
    deadlinePayload: {
      id: input.deadlineId,
      processId: input.attendance.processId,
      clientId: input.attendance.clientId,
      title: requireNonEmptyString('title', input.title),
      description: input.attendance.summary || input.attendance.subject,
      dueDate: input.dueDate,
      priority: deadlinePriority,
      responsible: input.responsible ?? null,
      origin: 'atendimento' as const,
      attendanceId: input.attendance.attendanceId,
      notes: input.attendance.notes,
    },
    auditEvent: buildAttendanceAuditEvent({
      action: 'attendance.convertToDeadline',
      attendanceId: attendance.attendanceId,
      actorUserId: input.actorUserId,
      occurredAt: updatedAt,
      context: {
        deadlineId: input.deadlineId,
        dueDate: input.dueDate,
        priority: deadlinePriority,
      },
      diff: {
        before: {
          conversionState: input.attendance.conversionState,
          derivedDeadlineId: input.attendance.derivedDeadlineId,
        },
        after: {
          conversionState: attendance.conversionState,
          derivedDeadlineId: attendance.derivedDeadlineId,
        },
      },
      idempotencyKey: input.idempotencyKey ?? null,
    }),
  };
}
