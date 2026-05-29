const test = require('node:test');
const assert = require('node:assert/strict');

test('normalizeCnjPublicationPayload maps remote payload into capture contract', async () => {
  const { normalizeCnjPublicationPayload } = require('../dist/cnj-publications.provider.js');

  const payload = normalizeCnjPublicationPayload({
    id: 'ABC-1',
    numeroProcesso: '10000011120265020001',
    tribunal: 'TJSP',
    publicationUrl: 'https://cnj.exemplo/ABC-1',
    title: 'Sentença publicada',
    resumo: 'Prazo recursal em aberto.',
    textoIntegral: 'Sentença publicada com prazo recursal.',
    dataPublicacao: '2026-05-16T12:00:00.000Z',
    cpf: '12345678900',
    nomeParte: 'Cliente Atlas',
  });

  assert.equal(payload.sourceReference, 'ABC-1');
  assert.equal(payload.processNumber, '10000011120265020001');
  assert.equal(payload.tribunal, 'TJSP');
  assert.equal(payload.title, 'Sentença publicada');
  assert.equal(payload.personName, 'Cliente Atlas');
  assert.equal(payload.sourceUrl, 'https://cnj.exemplo/ABC-1');
});
