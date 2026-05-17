const test = require('node:test');
const assert = require('node:assert/strict');

test('normalizeOabPublicationPayload maps oab publication payload', async () => {
  const { normalizeOabPublicationPayload } = require('../dist/oab-publications.provider.js');

  const payload = normalizeOabPublicationPayload({
    id: 'OAB-1',
    oab: 'SP123456',
    numeroProcesso: '10000011120265020001',
    tribunal: 'TJSP',
    title: 'Intimação localizada por OAB',
    resumo: 'Prazo em aberto.',
    textoIntegral: 'Intimação vinculada à OAB com prazo em aberto.',
    dataPublicacao: '2026-05-16T09:00:00.000Z',
    nomeParte: 'Cliente Atlas',
    nomeAdvogado: 'advogado',
  });

  assert.equal(payload.sourceReference, 'OAB-1');
  assert.equal(payload.oabNumber, 'SP123456');
  assert.equal(payload.processNumber, '10000011120265020001');
  assert.equal(payload.lawyerName, 'advogado');
});
