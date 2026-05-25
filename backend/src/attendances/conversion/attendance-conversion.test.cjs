const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const createModulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'attendances', 'core', 'attendance.create.js');
const conversionModulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'attendances', 'conversion', 'attendance-conversion.js');

test('convertAttendanceToTask emits linked task aggregate and updates conversion state', async () => {
  const {
    createAttendance,
  } = require(createModulePath);
  const {
    convertAttendanceToTask,
    convertAttendanceToDeadline,
  } = require(conversionModulePath);

  const created = createAttendance({
    attendanceId: 61,
    processId: 7,
    clientId: 14,
    channel: 'portal',
    type: 'triagem',
    subject: 'Pedido de revisão de prazo',
    summary: 'Cliente anexou novos documentos.',
    notes: 'Verificar se há impacto no cronograma.',
    ownerUserId: 19,
    portfolioId: 2,
    teamId: 4,
    priority: 'critica',
    occurredAt: '2026-05-25T09:30:00.000Z',
    nextStep: 'Abrir tarefa para análise.',
    scheduledReturnAt: null,
    slaPolicyCode: 'vip',
    actorUserId: 19,
    idempotencyKey: 'attendance:create:61',
    now: new Date('2026-05-25T09:30:00.000Z'),
  });

  const taskConversion = convertAttendanceToTask({
    attendance: created.attendance,
    taskId: 701,
    title: 'Analisar documentos do atendimento 61',
    dueDate: '2026-05-26',
    priority: 'alta',
    ownerUserId: 19,
    actorUserId: 19,
    idempotencyKey: 'attendance:task:61',
    now: new Date('2026-05-25T10:00:00.000Z'),
  });

  assert.equal(taskConversion.attendance.conversionState, 'convertido_tarefa');
  assert.equal(taskConversion.attendance.derivedTaskId, 701);
  assert.equal(taskConversion.task.linkedEntities[0].entityType, 'attendance');
  assert.equal(taskConversion.task.linkedEntities[0].entityId, 61);
  assert.equal(taskConversion.task.workflowStage, 'planejamento');
  assert.equal(taskConversion.taskPayload.origin, 'atendimento');
  assert.equal(taskConversion.auditEvent.action, 'attendance.convertToTask');

  const deadlineConversion = convertAttendanceToDeadline({
    attendance: created.attendance,
    deadlineId: 880,
    title: 'Prazo decorrente do atendimento 61',
    dueDate: '2026-05-27',
    priority: 'critica',
    responsible: 'time-recursal',
    actorUserId: 19,
    idempotencyKey: 'attendance:deadline:61',
    now: new Date('2026-05-25T10:30:00.000Z'),
  });

  assert.equal(deadlineConversion.attendance.conversionState, 'convertido_prazo');
  assert.equal(deadlineConversion.attendance.derivedDeadlineId, 880);
  assert.equal(deadlineConversion.deadlinePayload.processId, 7);
  assert.equal(deadlineConversion.deadlinePayload.priority, 'alta');
  assert.equal(deadlineConversion.deadlinePayload.origin, 'atendimento');
  assert.equal(deadlineConversion.auditEvent.action, 'attendance.convertToDeadline');
});

test('convertAttendanceToDeadline requires process context', async () => {
  const {
    createAttendance,
  } = require(createModulePath);
  const {
    convertAttendanceToDeadline,
  } = require(conversionModulePath);

  const created = createAttendance({
    attendanceId: 62,
    processId: null,
    clientId: 14,
    channel: 'interno',
    type: 'rotina',
    subject: 'Apontamento interno',
    summary: null,
    notes: null,
    ownerUserId: 3,
    portfolioId: null,
    teamId: null,
    priority: 'baixa',
    occurredAt: '2026-05-25T09:30:00.000Z',
    nextStep: null,
    scheduledReturnAt: null,
    slaPolicyCode: 'custom',
    slaTargetAt: '2026-05-28T09:30:00.000Z',
    actorUserId: 3,
    idempotencyKey: 'attendance:create:62',
    now: new Date('2026-05-25T09:30:00.000Z'),
  });

  assert.throws(
    () =>
      convertAttendanceToDeadline({
        attendance: created.attendance,
        deadlineId: 881,
        title: 'Prazo sem processo',
        dueDate: '2026-05-27',
        priority: 'media',
        responsible: null,
        actorUserId: 3,
        idempotencyKey: 'attendance:deadline:62',
        now: new Date('2026-05-25T10:30:00.000Z'),
      }),
    /DEADLINE_PROCESS_REQUIRED/,
  );
});
