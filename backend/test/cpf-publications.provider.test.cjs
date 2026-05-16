const test = require('node:test');
const assert = require('node:assert/strict');

test('normalizeCpfPublicationPayload maps cpf publication payload', async () => {
  const { normalizeCpfPublicationPayload } = require('../dist/cpf-publications.provider.js');

  const payload = normalizeCpfPublicationPayload({
    id: 'CPF-1',
    cpf: '12345678900',
    tribunal: 'TJMG',
    title: 'Publicação localizada por CPF',
    resumo: 'Cliente sem processo ativo na carteira.',
    textoIntegral: 'Publicação encontrada por CPF sem processo ativo.',
    dataPublicacao: '2026-05-16T18:00:00.000Z',
    personName: 'Cliente Prisma',
  });

  assert.equal(payload.sourceReference, 'CPF-1');
  assert.equal(payload.cpf, '12345678900');
  assert.equal(payload.personName, 'Cliente Prisma');
  assert.equal(payload.tribunal, 'TJMG');
});
