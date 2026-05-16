const test = require('node:test');
const assert = require('node:assert/strict');

test('buildTemplatePayload composes template data for the modelos de pecas screen', async () => {
  const { buildTemplatePayload } = require('../dist/templates.contract.js');

  const payload = buildTemplatePayload({
    id: 8,
    name: 'Contestação — Trabalhista (Inicial)',
    legalArea: 'Trabalhista',
    pieceType: 'Contestação',
    status: 'ativo',
    official: true,
    favorite: false,
    autoFill: true,
    phase: 'Inicial',
    author: 'advogado',
    version: 'v2.1',
    updatedOn: new Date('2026-05-16T00:00:00.000Z'),
    lastUsedAt: new Date('2026-05-14T00:00:00.000Z'),
    needsReview: false,
    description: 'Modelo de contestação com estrutura padrão e precedentes recentes.',
    tags: ['recurso', 'cliente-pj'],
    placeholders: ['vara', 'numero_processo', 'nome_cliente'],
    preview: 'Contestação padrão',
    versionsJson: [{ id: '8-v2', version: 'v2.1', current: true }],
  });

  assert.equal(payload.id, '8');
  assert.equal(payload.nome, 'Contestação — Trabalhista (Inicial)');
  assert.equal(payload.area, 'Trabalhista');
  assert.equal(payload.tipoPeca, 'Contestação');
  assert.equal(payload.status, 'ativo');
  assert.equal(payload.oficial, true);
  assert.equal(payload.favorito, false);
  assert.equal(payload.autoFill, true);
  assert.equal(payload.fase, 'Inicial');
  assert.equal(payload.autor, 'advogado');
  assert.equal(payload.versao, 'v2.1');
  assert.equal(payload.ultimaAtualizacao, '2026-05-16');
  assert.equal(payload.usoRecente, '2026-05-14');
  assert.equal(payload.precisaRevisao, false);
  assert.deepEqual(payload.tags, ['recurso', 'cliente-pj']);
  assert.deepEqual(payload.placeholders, ['vara', 'numero_processo', 'nome_cliente']);
  assert.equal(payload.preview, 'Contestação padrão');
  assert.deepEqual(payload.versions, [{ id: '8-v2', version: 'v2.1', current: true }]);
});
