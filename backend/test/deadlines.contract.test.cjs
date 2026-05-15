const test = require('node:test');
const assert = require('node:assert/strict');

test('buildDeadlinePayload composes deadline data for the prazos screen', async () => {
  const { buildDeadlinePayload } = require('../dist/deadlines.contract.js');

  const payload = buildDeadlinePayload({
    id: 14,
    title: 'Prazo de manifestação',
    dueDate: new Date('2026-05-20T00:00:00.000Z'),
    status: 'critico',
    priority: 'alta',
    origin: 'publicacao',
    responsible: 'advogado',
    legalArea: 'Trabalhista',
    notes: 'Validar documentos e protocolar até as 17h.',
    completedAt: null,
    processId: 7,
    process: {
      id: 7,
      title: 'Reclamatória Trabalhista Cliente Atlas',
      client: 'Cliente Atlas',
      phase: 'Inicial',
      status: 'ativo',
      owner: { id: 2, email: 'advogado@juridico.com', role: 'ADV' },
      clientRecord: { id: 3, name: 'Cliente Atlas', legalArea: 'Trabalhista' },
    },
  });

  assert.equal(payload.id, 14);
  assert.equal(payload.title, 'Prazo de manifestação');
  assert.equal(payload.processId, 7);
  assert.equal(payload.processLabel, '#7');
  assert.equal(payload.processTitle, 'Reclamatória Trabalhista Cliente Atlas');
  assert.equal(payload.client, 'Cliente Atlas');
  assert.equal(payload.origin, 'publicacao');
  assert.equal(payload.dueDate, '2026-05-20');
  assert.equal(payload.status, 'critico');
  assert.equal(payload.priority, 'alta');
  assert.equal(payload.owner, 'advogado');
  assert.equal(payload.area, 'Trabalhista');
  assert.equal(payload.notes, 'Validar documentos e protocolar até as 17h.');
  assert.equal(payload.completedAt, null);
});
