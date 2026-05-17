const test = require('node:test');
const assert = require('node:assert/strict');

test('buildCrmLeadPayload maps lead contract', async () => {
  const { buildCrmLeadPayload } = require('../dist/crm.contract.js');

  const payload = buildCrmLeadPayload({
    id: 7,
    cpf: '12345678900',
    personName: 'Cliente Atlas',
    source: 'publicacao_automatizada',
    status: 'novo',
    responsible: 'advogado@juridico.com',
    summary: 'Sinal comercial originado por publicação.',
    lastContactAt: new Date('2026-05-16T12:15:00.000Z'),
    nextContactAt: new Date('2026-05-17T09:00:00.000Z'),
    createdAt: new Date('2026-05-16T12:00:00.000Z'),
    updatedAt: new Date('2026-05-16T12:30:00.000Z'),
    clientRecord: { id: 3, name: 'Cliente Atlas' },
    triageItems: [{ id: 9, queueType: 'critica', status: 'pendente' }],
    contactEvents: [{ id: 1, kind: 'contato', summary: 'Ligação inicial.', createdBy: 'admin@juridico.com', createdAt: new Date('2026-05-16T12:10:00.000Z') }],
  });

  assert.equal(payload.client, 'Cliente Atlas');
  assert.equal(payload.triageCount, 1);
  assert.equal(payload.hasCriticalTriage, true);
  assert.equal(payload.responsible, 'advogado@juridico.com');
  assert.equal(payload.contactEvents.length, 1);
  assert.equal(payload.lastContactAt, '2026-05-16T12:15:00.000Z');
});

test('buildCrmOpportunityPayload maps opportunity contract', async () => {
  const { buildCrmOpportunityPayload } = require('../dist/crm.contract.js');

  const payload = buildCrmOpportunityPayload({
    id: 11,
    convertedProcessId: 22,
    cpf: '12345678900',
    personName: 'Cliente Prisma',
    source: 'publicacao_automatizada',
    status: 'acao_recomendada',
    responsible: null,
    summary: 'Nova frente identificada.',
    createdAt: new Date('2026-05-16T12:00:00.000Z'),
    updatedAt: new Date('2026-05-16T12:30:00.000Z'),
    clientRecord: null,
    triageItems: [],
    contactEvents: [],
  });

  assert.equal(payload.client, '');
  assert.equal(payload.convertedProcessId, 22);
  assert.equal(payload.triageCount, 0);
  assert.equal(payload.hasCriticalTriage, false);
  assert.equal(payload.responsible, '');
});
