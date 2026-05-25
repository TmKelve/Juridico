export type AttendanceStatus =
  | 'aberto'
  | 'triagem'
  | 'em_atendimento'
  | 'aguardando_cliente'
  | 'resolvido'
  | 'fechado_fora_sla'
  | 'cancelado';

export type AttendancePriority = 'baixa' | 'media' | 'alta' | 'critica';
export type AttendancePriorityInput = AttendancePriority | 'critical';
export type AttendanceChannel = 'whatsapp' | 'telefone' | 'email' | 'presencial' | 'portal' | 'interno';
export type AttendanceType = 'consulta' | 'urgencia' | 'rotina' | 'triagem' | 'acompanhamento';
export type AttendanceSlaPolicyCode = 'default' | 'urgent' | 'vip' | 'custom';
export type AttendanceConversionState =
  | 'nao_aplicavel'
  | 'elegivel_tarefa'
  | 'elegivel_prazo'
  | 'convertido_tarefa'
  | 'convertido_prazo';
export type AttendanceOperationalState =
  | 'novo'
  | 'em_triagem'
  | 'em_atendimento'
  | 'pendente_cliente'
  | 'resolvido'
  | 'encerrado_fora_sla'
  | 'cancelado';

export type AttendanceAuditEvent = {
  id: string;
  scope: 'attendance';
  action: string;
  status: 'success' | 'warning' | 'error';
  entityType: 'attendance';
  entityId: number;
  actor: `user:${number}` | 'system' | 'scheduler';
  occurredAt: string;
  context: Record<string, unknown>;
  diff: Record<string, unknown> | null;
  idempotencyKey: string | null;
  correlationId: string | null;
};

export type AttendanceAggregate = {
  attendanceId: number;
  processId: number | null;
  clientId: number | null;
  status: AttendanceStatus;
  priority: AttendancePriority;
  channel: AttendanceChannel;
  type: AttendanceType;
  subject: string;
  summary: string;
  notes: string | null;
  ownerUserId: number | null;
  portfolioId: number | null;
  teamId: number | null;
  slaPolicyCode: AttendanceSlaPolicyCode;
  slaTargetAt: string | null;
  slaBreached: boolean;
  conversionState: AttendanceConversionState;
  derivedTaskId: number | null;
  derivedDeadlineId: number | null;
  createdAt: string;
  updatedAt: string;
  occurredAt: string;
  nextStep: string | null;
  scheduledReturnAt: string | null;
  critical: boolean;
  critico: boolean;
  operationalState: AttendanceOperationalState;
};

export function requireNonEmptyString(field: string, value: string | null | undefined) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`ATTENDANCE_INVALID: ${field} obrigatorio.`);
  }

  return value.trim();
}

export function toIsoDateTime(field: string, value: Date | string) {
  const resolved = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(resolved.getTime())) {
    throw new Error(`ATTENDANCE_INVALID: ${field} invalido.`);
  }
  return resolved.toISOString();
}

export function normalizeAttendancePriority(priority: AttendancePriorityInput | null | undefined, flags?: {
  critical?: boolean | null;
  critico?: boolean | null;
}): AttendancePriority {
  if (priority === 'critical') return 'critica';
  if (priority) return priority;
  if (flags?.critical || flags?.critico) return 'critica';
  return 'media';
}

export function isAttendanceCritical(input: {
  priority?: AttendancePriorityInput | null;
  critical?: boolean | null;
  critico?: boolean | null;
}) {
  return normalizeAttendancePriority(input.priority, input) === 'critica' || Boolean(input.critical) || Boolean(input.critico);
}

export function resolveAttendanceConversionState(params: {
  processId: number | null;
  status: AttendanceStatus;
  derivedTaskId?: number | null;
  derivedDeadlineId?: number | null;
}): AttendanceConversionState {
  if (params.derivedTaskId) return 'convertido_tarefa';
  if (params.derivedDeadlineId) return 'convertido_prazo';
  if (params.status === 'resolvido' || params.status === 'fechado_fora_sla' || params.status === 'cancelado') return 'nao_aplicavel';
  return params.processId ? 'elegivel_prazo' : 'elegivel_tarefa';
}

export function resolveAttendanceOperationalState(status: AttendanceStatus): AttendanceOperationalState {
  switch (status) {
    case 'triagem':
      return 'em_triagem';
    case 'em_atendimento':
      return 'em_atendimento';
    case 'aguardando_cliente':
      return 'pendente_cliente';
    case 'resolvido':
      return 'resolvido';
    case 'fechado_fora_sla':
      return 'encerrado_fora_sla';
    case 'cancelado':
      return 'cancelado';
    case 'aberto':
    default:
      return 'novo';
  }
}

export function buildAttendanceAuditEvent(input: {
  action: string;
  status?: 'success' | 'warning' | 'error';
  attendanceId: number;
  actorUserId: number;
  occurredAt: string;
  context: Record<string, unknown>;
  diff?: Record<string, unknown> | null;
  idempotencyKey?: string | null;
  correlationId?: string | null;
}): AttendanceAuditEvent {
  return {
    id: `attendance:${input.action}:${input.attendanceId}:${input.occurredAt}`,
    scope: 'attendance',
    action: input.action,
    status: input.status ?? 'success',
    entityType: 'attendance',
    entityId: input.attendanceId,
    actor: `user:${input.actorUserId}`,
    occurredAt: input.occurredAt,
    context: input.context,
    diff: input.diff ?? null,
    idempotencyKey: input.idempotencyKey ?? null,
    correlationId: input.correlationId ?? null,
  };
}

export function buildLegacyAttendancePayload(attendance: AttendanceAggregate, context: {
  processTitle?: string | null;
  clientName?: string | null;
  ownerLabel?: string | null;
}) {
  return {
    id: attendance.attendanceId,
    processId: attendance.processId,
    processLabel: attendance.processId ? `#${attendance.processId}` : '—',
    processTitle: context.processTitle ?? '',
    clientId: attendance.clientId,
    client: context.clientName ?? 'Cliente não informado',
    canal: attendance.channel,
    tipo: attendance.type,
    assunto: attendance.subject,
    resumo: attendance.summary,
    observacoes: attendance.notes ?? '',
    status: attendance.status,
    priority: attendance.priority,
    responsavel: context.ownerLabel ?? 'sem-responsavel',
    area: 'Civel',
    dataHora: attendance.occurredAt,
    proximoPasso: attendance.nextStep ?? '',
    retornoAgendado: attendance.scheduledReturnAt ? attendance.scheduledReturnAt.slice(0, 10) : null,
    critico: attendance.critico,
    critical: attendance.critical,
    actorEmail: null,
    owner: null,
    slaTargetAt: attendance.slaTargetAt,
    slaBreached: attendance.slaBreached,
    conversionState: attendance.conversionState,
    derivedTaskId: attendance.derivedTaskId,
    derivedDeadlineId: attendance.derivedDeadlineId,
    operationalState: attendance.operationalState,
  };
}
