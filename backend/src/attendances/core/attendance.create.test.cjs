const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'attendances', 'core', 'attendance.create.js');

test('createAttendance builds aggregate, SLA target and legacy payload with critico/critical compatibility', async () => {
  const {
    createAttendance,
    buildLegacyAttendancePayload,
  } = require(modulePath);

  const result = createAttendance({
    attendanceId: 41,
    processId: 9,
    clientId: 17,
    channel: 'whatsapp',
    type: 'urgencia',
    subject: 'Cliente sem acesso ao portal',
    summary: 'Solicita retorno ainda hoje.',
    notes: 'Mensagem recebida no fim do expediente.',
    ownerUserId: 13,
    portfolioId: 5,
    teamId: 2,
    priority: 'critical',
    occurredAt: '2026-05-25T12:00:00.000Z',
    nextStep: 'Ligar para validar o bloqueio.',
    scheduledReturnAt: '2026-05-25T15:00:00.000Z',
    slaPolicyCode: 'urgent',
    actorUserId: 7,
    idempotencyKey: 'attendance:create:41',
    now: new Date('2026-05-25T12:00:00.000Z'),
  });

  assert.equal(result.idempotency, 'created');
  assert.equal(result.attendance.status, 'aberto');
  assert.equal(result.attendance.priority, 'critica');
  assert.equal(result.attendance.slaTargetAt, '2026-05-25T16:00:00.000Z');
  assert.equal(result.attendance.slaBreached, false);
  assert.equal(result.attendance.conversionState, 'elegivel_prazo');
  assert.equal(result.attendance.operationalState, 'novo');
  assert.equal(result.auditEvent.scope, 'attendance');
  assert.equal(result.auditEvent.action, 'attendance.create');
  assert.equal(result.auditEvent.actor, 'user:7');

  const legacyPayload = buildLegacyAttendancePayload(result.attendance, {
    processTitle: 'Cumprimento de sentença',
    clientName: 'Cliente Nexo',
    ownerLabel: 'time-civel',
  });

  assert.equal(legacyPayload.canal, 'whatsapp');
  assert.equal(legacyPayload.assunto, 'Cliente sem acesso ao portal');
  assert.equal(legacyPayload.critico, true);
  assert.equal(legacyPayload.critical, true);
  assert.equal(legacyPayload.priority, 'critica');
  assert.equal(legacyPayload.dataHora, '2026-05-25T12:00:00.000Z');
});
