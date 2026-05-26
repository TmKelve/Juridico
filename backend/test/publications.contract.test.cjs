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
    derivedDeadlineId: 22,
    notes: 'Priorizar triagem do conteúdo antes do retorno ao cliente.',
    read: true,
    correlationId: 'corr-pub-14',
    sourceType: 'diario',
    sourceReference: 'DJE-TJSP-2026-05-15-00014',
    originKind: 'publication',
    originStage: 'consolidado',
    consolidationStatus: 'consolidado',
    captureId: 81,
    eventId: 141,
    evidenceUrl: '/publication-captures/81/evidence',
    publicationUrl: '/publications/14',
    timelineUrl: '/publication-pipeline/corr-pub-14',
    pipelineStatus: 'gerou_prazo',
    pipelineTimeline: [
      {
        id: 'capture-81',
        entityType: 'capture',
        entityId: 81,
        stage: 'capturado',
        title: 'Captura inicial',
        summary: 'Publicação capturada do DJE.',
        status: 'capturado',
        occurredAt: '2026-05-15T08:00:00.000Z',
        sourceType: 'diario',
        sourceReference: 'DJE-TJSP-2026-05-15-00014',
        link: '/publication-captures/81',
      },
      {
        id: 'publication-14',
        entityType: 'publication',
        entityId: 14,
        stage: 'gerou_prazo',
        title: 'Prazo derivado criado',
        summary: 'Publicação consolidada com prazo operacional.',
        status: 'gerou_prazo',
        occurredAt: '2026-05-15T12:00:00.000Z',
        sourceType: 'diario',
        sourceReference: 'DJE-TJSP-2026-05-15-00014',
        link: '/publications/14',
      },
    ],
    fallbacks: [{ code: 'missing_task', message: 'Tarefa operacional ainda não criada.' }],
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
  assert.equal(payload.derivedDeadlineId, 22);
  assert.equal(payload.observacoes, 'Priorizar triagem do conteúdo antes do retorno ao cliente.');
  assert.equal(payload.lida, true);
  assert.equal(payload.correlationId, 'corr-pub-14');
  assert.equal(payload.originReference.originKind, 'publication');
  assert.equal(payload.originReference.timelineUrl, '/publication-pipeline/corr-pub-14');
  assert.equal(payload.pipeline.status, 'gerou_prazo');
  assert.equal(payload.pipeline.timeline.length, 2);
  assert.equal(payload.pipeline.timeline[0].entityType, 'capture');
  assert.equal(payload.derivedActions.length, 1);
  assert.equal(payload.derivedActions[0].entityType, 'deadline');
  assert.equal(payload.derivedActions[0].entityId, 22);
  assert.equal(payload.fallbacks.length, 1);
});
