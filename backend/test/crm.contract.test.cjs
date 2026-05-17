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
    summary: 'Sinal comercial originado por publicação.',
    createdAt: new Date('2026-05-16T12:00:00.000Z'),
    updatedAt: new Date('2026-05-16T12:30:00.000Z'),
    clientRecord: { id: 3, name: 'Cliente Atlas' },
    triageItems: [{ id: 9, queueType: 'critica', status: 'pendente' }],
  });

  assert.equal(payload.client, 'Cliente Atlas');
  assert.equal(payload.triageCount, 1);
  assert.equal(payload.hasCriticalTriage, true);
});

test('buildCrmOpportunityPayload maps opportunity contract', async () => {
  const { buildCrmOpportunityPayload } = require('../dist/crm.contract.js');

  const payload = buildCrmOpportunityPayload({
    id: 11,
    cpf: '12345678900',
    personName: 'Cliente Prisma',
    source: 'publicacao_automatizada',
    status: 'acao_recomendada',
    summary: 'Nova frente identificada.',
    createdAt: new Date('2026-05-16T12:00:00.000Z'),
    updatedAt: new Date('2026-05-16T12:30:00.000Z'),
    clientRecord: null,
    triageItems: [],
  });

  assert.equal(payload.client, '');
  assert.equal(payload.triageCount, 0);
  assert.equal(payload.hasCriticalTriage, false);
});
