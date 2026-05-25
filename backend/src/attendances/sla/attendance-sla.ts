import {
  buildAttendanceAuditEvent,
  normalizeAttendancePriority,
  requireNonEmptyString,
  resolveAttendanceConversionState,
  resolveAttendanceOperationalState,
  toIsoDateTime,
  type AttendanceAggregate,
  type AttendancePriorityInput,
  type AttendanceSlaPolicyCode,
  type AttendanceStatus,
} from '../core/attendance.model';

const slaHoursByPolicy: Record<Exclude<AttendanceSlaPolicyCode, 'custom'>, number> = {
  default: 24,
  urgent: 4,
  vip: 8,
};

function roundHours(value: number) {
  return Math.round(value * 100) / 100;
}

export function computeAttendanceSla(input: {
  policyCode: AttendanceSlaPolicyCode;
  priority?: AttendancePriorityInput | null;
  occurredAt: Date | string;
  now: Date;
  slaTargetAt?: Date | string | null;
}) {
  const occurredAtIso = toIsoDateTime('occurredAt', input.occurredAt);
  const start = new Date(occurredAtIso);
  const explicitTarget = input.slaTargetAt ? new Date(toIsoDateTime('slaTargetAt', input.slaTargetAt)) : null;

  if (input.policyCode === 'custom') {
    if (!explicitTarget) {
      throw new Error('ATTENDANCE_SLA_POLICY_INVALID: custom requer slaTargetAt.');
    }

    return {
      slaPolicyCode: input.policyCode,
      slaHours: roundHours((explicitTarget.getTime() - start.getTime()) / (60 * 60 * 1000)),
      slaTargetAt: explicitTarget.toISOString(),
      breached: input.now.getTime() > explicitTarget.getTime(),
    };
  }

  const hours = slaHoursByPolicy[input.policyCode] ?? slaHoursByPolicy.default;
  const priority = normalizeAttendancePriority(input.priority ?? null);
  const boostedHours = priority === 'critica' && input.policyCode === 'default' ? 8 : hours;
  const target = explicitTarget ?? new Date(start.getTime() + boostedHours * 60 * 60 * 1000);

  return {
    slaPolicyCode: input.policyCode,
    slaHours: boostedHours,
    slaTargetAt: target.toISOString(),
    breached: input.now.getTime() > target.getTime(),
  };
}

export function updateAttendanceSla(input: {
  attendance: AttendanceAggregate;
  status: AttendanceStatus;
  slaTargetAt?: Date | string | null;
  allowCloseOutOfSla: boolean;
  justification?: string | null;
  actorUserId: number;
  idempotencyKey?: string | null;
  now: Date;
}) {
  const resolvedSla = computeAttendanceSla({
    policyCode: input.attendance.slaPolicyCode,
    priority: input.attendance.priority,
    occurredAt: input.attendance.occurredAt,
    now: input.now,
    slaTargetAt: input.slaTargetAt ?? input.attendance.slaTargetAt,
  });

  const justification = input.justification ? requireNonEmptyString('justification', input.justification) : null;
  const wantsResolution = input.status === 'resolvido';
  if (wantsResolution && resolvedSla.breached && !input.allowCloseOutOfSla) {
    throw new Error('ATTENDANCE_CLOSE_OUT_OF_SLA_DENIED: resolucao fora da SLA exige permissao explicita.');
  }

  const status = wantsResolution && resolvedSla.breached ? 'fechado_fora_sla' : input.status;
  const updatedAt = input.now.toISOString();
  const attendance: AttendanceAggregate = {
    ...input.attendance,
    status,
    slaTargetAt: resolvedSla.slaTargetAt,
    slaBreached: resolvedSla.breached,
    updatedAt,
    conversionState: resolveAttendanceConversionState({
      processId: input.attendance.processId,
      status,
      derivedTaskId: input.attendance.derivedTaskId,
      derivedDeadlineId: input.attendance.derivedDeadlineId,
    }),
    operationalState: resolveAttendanceOperationalState(status),
  };

  return {
    attendance,
    auditEvent: buildAttendanceAuditEvent({
      action: 'attendance.updateSla',
      attendanceId: attendance.attendanceId,
      actorUserId: input.actorUserId,
      occurredAt: updatedAt,
      context: {
        allowCloseOutOfSla: input.allowCloseOutOfSla,
        justification,
        requestedStatus: input.status,
      },
      diff: {
        before: {
          status: input.attendance.status,
          slaTargetAt: input.attendance.slaTargetAt,
          slaBreached: input.attendance.slaBreached,
        },
        after: {
          status: attendance.status,
          slaTargetAt: attendance.slaTargetAt,
          slaBreached: attendance.slaBreached,
        },
      },
      idempotencyKey: input.idempotencyKey ?? null,
    }),
  };
}
