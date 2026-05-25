const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const createModulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'attendances', 'core', 'attendance.create.js');
const slaModulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'attendances', 'sla', 'attendance-sla.js');

test('updateAttendanceSla closes within SLA and marks breach metadata when overdue close is allowed', async () => {
  const {
    createAttendance,
  } = require(createModulePath);
  const {
    updateAttendanceSla,
  } = require(slaModulePath);

  const created = createAttendance({
    attendanceId: 51,
    processId: null,
    clientId: 4,
    channel: 'email',
    type: 'consulta',
    subject: 'Orientação contratual',
    summary: null,
    notes: null,
    ownerUserId: null,
    portfolioId: null,
    teamId: null,
    priority: 'media',
    occurredAt: '2026-05-25T08:00:00.000Z',
    nextStep: null,
    scheduledReturnAt: null,
    slaPolicyCode: 'default',
    actorUserId: 22,
    idempotencyKey: 'attendance:create:51',
    now: new Date('2026-05-25T08:00:00.000Z'),
  });

  const resolved = updateAttendanceSla({
    attendance: created.attendance,
    status: 'resolvido',
    actorUserId: 22,
    allowCloseOutOfSla: false,
    justification: 'Orientação concluída em contato único.',
    idempotencyKey: 'attendance:update-sla:51',
    now: new Date('2026-05-25T12:00:00.000Z'),
  });

  assert.equal(resolved.attendance.status, 'resolvido');
  assert.equal(resolved.attendance.slaBreached, false);
  assert.equal(resolved.attendance.operationalState, 'resolvido');
  assert.equal(resolved.auditEvent.status, 'success');

  const overdue = updateAttendanceSla({
    attendance: created.attendance,
    status: 'resolvido',
    actorUserId: 22,
    allowCloseOutOfSla: true,
    justification: 'Cliente respondeu fora da janela.',
    idempotencyKey: 'attendance:update-sla:51-overdue',
    now: new Date('2026-05-26T12:30:00.000Z'),
  });

  assert.equal(overdue.attendance.status, 'fechado_fora_sla');
  assert.equal(overdue.attendance.slaBreached, true);
  assert.equal(overdue.attendance.operationalState, 'encerrado_fora_sla');
  assert.equal(overdue.auditEvent.context.allowCloseOutOfSla, true);
});

test('updateAttendanceSla blocks resolving out of SLA without explicit allowance', async () => {
  const {
    createAttendance,
  } = require(createModulePath);
  const {
    updateAttendanceSla,
  } = require(slaModulePath);

  const created = createAttendance({
    attendanceId: 52,
    processId: 3,
    clientId: 8,
    channel: 'telefone',
    type: 'acompanhamento',
    subject: 'Cobrança de status',
    summary: null,
    notes: null,
    ownerUserId: 11,
    portfolioId: 5,
    teamId: 9,
    priority: 'alta',
    occurredAt: '2026-05-25T06:00:00.000Z',
    nextStep: null,
    scheduledReturnAt: null,
    slaPolicyCode: 'urgent',
    actorUserId: 11,
    idempotencyKey: 'attendance:create:52',
    now: new Date('2026-05-25T06:00:00.000Z'),
  });

  assert.throws(
    () =>
      updateAttendanceSla({
        attendance: created.attendance,
        status: 'resolvido',
        actorUserId: 11,
        allowCloseOutOfSla: false,
        justification: null,
        idempotencyKey: 'attendance:update-sla:52',
        now: new Date('2026-05-25T12:00:00.000Z'),
      }),
    /ATTENDANCE_CLOSE_OUT_OF_SLA_DENIED/,
  );
});
