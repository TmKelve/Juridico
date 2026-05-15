const test = require('node:test');
const assert = require('node:assert/strict');

test('buildTaskPayload composes task data for the tarefas screen', async () => {
  const { buildTaskPayload } = require('../dist/tasks.contract.js');

  const payload = buildTaskPayload({
    id: 42,
    title: 'Retornar cliente sobre audiência',
    description: 'Ligar no período da tarde com posicionamento jurídico.',
    processId: 7,
    process: {
      id: 7,
      title: 'Reclamatória Trabalhista Cliente Atlas',
      client: 'Cliente Atlas',
      phase: 'Inicial',
      status: 'ativo',
      ownerId: 2,
      owner: { id: 2, email: 'advogado@juridico.com', role: 'ADV' },
      clientRecord: { id: 3, name: 'Cliente Atlas', legalArea: 'Trabalhista' },
    },
    clientId: 3,
    clientRecord: { id: 3, name: 'Cliente Atlas', legalArea: 'Trabalhista' },
    clientName: null,
    origin: 'atendimento',
    dueDate: new Date('2026-05-20T00:00:00.000Z'),
    status: 'pendente',
    priority: 'alta',
    owner: 'advogado',
    createdBy: 'admin',
    notes: 'Priorizar retorno antes do fim do expediente.',
    linkedToDeadline: false,
    linkedToPublication: false,
    linkedToDocument: false,
    immediateAction: true,
  });

  assert.equal(payload.id, 42);
  assert.equal(payload.processLabel, '#7');
  assert.equal(payload.processTitle, 'Reclamatória Trabalhista Cliente Atlas');
  assert.equal(payload.client, 'Cliente Atlas');
  assert.equal(payload.origin, 'atendimento');
  assert.equal(payload.dueDate, '2026-05-20');
  assert.equal(payload.owner, 'advogado');
  assert.equal(payload.createdBy, 'admin');
  assert.equal(payload.immediateAction, true);
});
