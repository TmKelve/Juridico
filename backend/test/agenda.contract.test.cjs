const test = require('node:test');
const assert = require('node:assert/strict');

test('buildAgendaPayload composes agenda event data for the agenda screen', async () => {
  const { buildAgendaPayload } = require('../dist/agenda.contract.js');

  const payload = buildAgendaPayload({
    id: 8,
    title: 'Retorno com Cliente Atlas',
    eventType: 'retorno_agendado',
    status: 'agendado',
    priority: 'alta',
    startAt: new Date('2026-05-20T14:00:00.000Z'),
    endAt: new Date('2026-05-20T15:00:00.000Z'),
    processId: 7,
    process: {
      id: 7,
      title: 'Reclamatória Trabalhista Cliente Atlas',
      client: 'Cliente Atlas',
      clientRecord: { id: 3, name: 'Cliente Atlas' },
      owner: { id: 2, email: 'advogado@juridico.com', role: 'ADV' },
    },
    clientId: 3,
    clientRecord: { id: 3, name: 'Cliente Atlas' },
    attendanceId: 5,
    attendance: null,
    taskId: null,
    task: null,
    responsible: 'advogado',
    locationOrChannel: 'Telefone',
    notes: 'Confirmar próximos passos do caso.',
    origin: 'atendimento',
    createdBy: 'admin',
  });

  assert.equal(payload.id, 8);
  assert.equal(payload.type, 'retorno_agendado');
  assert.equal(payload.date, '2026-05-20');
  assert.equal(payload.startTime, '14:00');
  assert.equal(payload.endTime, '15:00');
  assert.equal(payload.processLabel, '#7');
  assert.equal(payload.processTitle, 'Reclamatória Trabalhista Cliente Atlas');
  assert.equal(payload.client, 'Cliente Atlas');
  assert.equal(payload.isReturn, true);
  assert.equal(payload.isDeadline, false);
  assert.equal(payload.origin, 'atendimento');
  assert.equal(payload.responsible, 'advogado');
});
