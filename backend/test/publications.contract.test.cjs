const test = require('node:test');
const assert = require('node:assert/strict');

test('buildPublicationPayload composes publication data for the publicacoes screen', async () => {
  const { buildPublicationPayload } = require('../dist/publications.contract.js');

  const payload = buildPublicationPayload({
    id: 14,
    publicationType: 'intimacao',
    status: 'em_analise',
    impact: 'alto',
    tribunal: 'TJSP',
    origin: 'Diário de Justiça Eletrônico — TJSP',
    publishedAt: new Date('2026-05-15T00:00:00.000Z'),
    summary: 'Intimação para manifestação no prazo de 15 dias sobre documentos juntados.',
    relevantText: 'Vistos. Intimem-se as partes para manifestação no prazo legal.',
    requiresAction: true,
    convertedToDeadline: true,
    derivedDeadlineLabel: 'Prazo: 30/05/2026',
    notes: 'Priorizar triagem do conteúdo antes do retorno ao cliente.',
    read: true,
    processId: 7,
    process: {
      id: 7,
      title: 'Reclamatória Trabalhista Cliente Atlas',
      client: 'Cliente Atlas',
      clientRecord: { id: 3, name: 'Cliente Atlas' },
    },
  });

  assert.equal(payload.id, 14);
  assert.equal(payload.tipo, 'intimacao');
  assert.equal(payload.status, 'em_analise');
  assert.equal(payload.impacto, 'alto');
  assert.equal(payload.processId, 7);
  assert.equal(payload.processLabel, '#7');
  assert.equal(payload.processTitle, 'Reclamatória Trabalhista Cliente Atlas');
  assert.equal(payload.client, 'Cliente Atlas');
  assert.equal(payload.tribunal, 'TJSP');
  assert.equal(payload.origem, 'Diário de Justiça Eletrônico — TJSP');
  assert.equal(payload.dataPublicacao, '2026-05-15');
  assert.equal(payload.resumo, 'Intimação para manifestação no prazo de 15 dias sobre documentos juntados.');
  assert.equal(payload.textoRelevante, 'Vistos. Intimem-se as partes para manifestação no prazo legal.');
  assert.equal(payload.exigeAcao, true);
  assert.equal(payload.convertidaEmPrazo, true);
  assert.equal(payload.prazoDerivedoLabel, 'Prazo: 30/05/2026');
  assert.equal(payload.observacoes, 'Priorizar triagem do conteúdo antes do retorno ao cliente.');
  assert.equal(payload.lida, true);
});
