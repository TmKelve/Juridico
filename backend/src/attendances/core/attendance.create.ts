import { computeAttendanceSla } from '../sla/attendance-sla';
import {
  buildAttendanceAuditEvent,
  buildLegacyAttendancePayload,
  isAttendanceCritical,
  normalizeAttendancePriority,
  requireNonEmptyString,
  resolveAttendanceConversionState,
  resolveAttendanceOperationalState,
  toIsoDateTime,
  type AttendanceAggregate,
  type AttendanceChannel,
  type AttendancePriorityInput,
  type AttendanceSlaPolicyCode,
  type AttendanceType,
} from './attendance.model';

export function createAttendance(input: {
  attendanceId: number;
  processId: number | null;
  clientId: number | null;
  channel?: AttendanceChannel | null;
  type?: AttendanceType | null;
  subject: string;
  summary?: string | null;
  notes?: string | null;
  ownerUserId: number | null;
  portfolioId: number | null;
  teamId: number | null;
  priority?: AttendancePriorityInput | null;
  occurredAt?: Date | string | null;
  nextStep?: string | null;
  scheduledReturnAt?: Date | string | null;
  slaPolicyCode?: AttendanceSlaPolicyCode | null;
  slaTargetAt?: Date | string | null;
  actorUserId: number;
  idempotencyKey?: string | null;
  now?: Date;
  critical?: boolean | null;
  critico?: boolean | null;
}) {
  const now = input.now ?? new Date();
  const occurredAt = toIsoDateTime('occurredAt', input.occurredAt ?? now);
  const createdAt = now.toISOString();
  const priority = normalizeAttendancePriority(input.priority, {
    critical: input.critical,
    critico: input.critico,
  });
  const critical = isAttendanceCritical({
    priority,
    critical: input.critical,
    critico: input.critico,
  });
  const sla = computeAttendanceSla({
    policyCode: input.slaPolicyCode ?? 'default',
    priority,
    occurredAt,
    now,
    slaTargetAt: input.slaTargetAt ?? null,
  });

  const attendance: AttendanceAggregate = {
    attendanceId: input.attendanceId,
    processId: input.processId ?? null,
    clientId: input.clientId ?? null,
    status: 'aberto',
    priority,
    channel: input.channel ?? 'interno',
    type: input.type ?? 'rotina',
    subject: requireNonEmptyString('subject', input.subject),
    summary: typeof input.summary === 'string' ? input.summary.trim() : '',
    notes: typeof input.notes === 'string' ? input.notes.trim() : null,
    ownerUserId: input.ownerUserId ?? null,
    portfolioId: input.portfolioId ?? null,
    teamId: input.teamId ?? null,
    slaPolicyCode: input.slaPolicyCode ?? 'default',
    slaTargetAt: sla.slaTargetAt,
    slaBreached: sla.breached,
    conversionState: resolveAttendanceConversionState({
      processId: input.processId ?? null,
      status: 'aberto',
    }),
    derivedTaskId: null,
    derivedDeadlineId: null,
    createdAt,
    updatedAt: createdAt,
    occurredAt,
    nextStep: typeof input.nextStep === 'string' ? input.nextStep.trim() : null,
    scheduledReturnAt: input.scheduledReturnAt ? toIsoDateTime('scheduledReturnAt', input.scheduledReturnAt) : null,
    critical,
    critico: critical,
    operationalState: resolveAttendanceOperationalState('aberto'),
  };

  return {
    attendance,
    auditEvent: buildAttendanceAuditEvent({
      action: 'attendance.create',
      attendanceId: attendance.attendanceId,
      actorUserId: input.actorUserId,
      occurredAt: createdAt,
      context: {
        processId: attendance.processId,
        clientId: attendance.clientId,
        channel: attendance.channel,
        type: attendance.type,
        priority: attendance.priority,
        slaPolicyCode: attendance.slaPolicyCode,
      },
      diff: {
        after: {
          status: attendance.status,
          slaTargetAt: attendance.slaTargetAt,
          conversionState: attendance.conversionState,
        },
      },
      idempotencyKey: input.idempotencyKey ?? null,
    }),
    idempotency: 'created' as const,
    legacyPayload: buildLegacyAttendancePayload(attendance, {}),
  };
}

export { buildLegacyAttendancePayload } from './attendance.model';
