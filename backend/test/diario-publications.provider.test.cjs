const test = require('node:test');
const assert = require('node:assert/strict');

test('normalizeDiarioPublicationPayload maps diario payload', async () => {
  const { normalizeDiarioPublicationPayload } = require('../dist/diario-publications.provider.js');

  const payload = normalizeDiarioPublicationPayload({
    id: 'DO-1',
    numeroProcesso: '10000011120265020001',
    tribunal: 'TJSP',
    title: 'Despacho com prazo em diário oficial',
    resumo: 'Manifestação necessária.',
    textoIntegral: 'Despacho publicado em diário oficial com manifestação.',
    dataPublicacao: '2026-05-16T07:00:00.000Z',
    nomeParte: 'Cliente Atlas',
  });

  assert.equal(payload.sourceReference, 'DO-1');
  assert.equal(payload.processNumber, '10000011120265020001');
  assert.equal(payload.tribunal, 'TJSP');
  assert.equal(payload.personName, 'Cliente Atlas');
});
