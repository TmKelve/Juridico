const test = require('node:test');
const assert = require('node:assert/strict');

test('buildTriageItemPayload composes triage workspace data', async () => {
  const { buildTriageItemPayload, buildTriageDecisionPayload } = require('../dist/triage.contract.js');

  const payload = buildTriageItemPayload({
    id: 9,
    queueType: 'critica',
    status: 'pendente',
    suggestedAction: 'criar_prazo',
    suggestedReason: 'Publicação com indício de prazo e risco processual.',
    aiConfidenceBand: 'alta',
    aiScoreRaw: 0.92,
    postponeUntil: null,
    assignedQueue: 'fila_central',
    handledBy: null,
    handledAt: null,
    discardReason: null,
    discardNote: null,
    sourceLabel: 'CNJ',
    correlationId: 'corr-triage-9',
    pipelineStatus: 'triado',
    originStage: 'normalizado',
    consolidationStatus: 'aguardando_consolidacao',
    pipelineTimeline: [
      {
        id: 'capture-11',
        entityType: 'capture',
        entityId: 11,
        stage: 'capturado',
        title: 'Captura CNJ',
        summary: 'Evento inicial capturado.',
        status: 'capturado',
        occurredAt: '2026-05-16T08:00:00.000Z',
        sourceType: 'cnj',
        sourceReference: 'CNJ-123',
        link: '/publication-captures/11',
      },
      {
        id: 'triage-9',
        entityType: 'triage',
        entityId: 9,
        stage: 'triado',
        title: 'Triagem pendente',
        summary: 'Aguardando decisão operacional.',
        status: 'triado',
        occurredAt: '2026-05-16T09:00:00.000Z',
        sourceType: 'cnj',
        sourceReference: 'CNJ-123',
        link: '/triage/9',
      },
    ],
    derivedActions: [
      {
        entityType: 'crm_lead',
        entityId: 18,
        correlationId: 'corr-triage-9',
        sourceType: 'cnj',
        sourceReference: 'CNJ-123',
        originStage: 'triado',
        status: 'novo',
        title: 'Lead operacional aberto',
        summary: 'Lead aguardando qualificação.',
        url: '/crm/leads/18',
        createdAt: '2026-05-16T09:05:00.000Z',
      },
    ],
    fallbacks: [{ code: 'deadline_pending_confirmation', message: 'Prazo depende de confirmação humana.' }],
    createdAt: new Date('2026-05-16T09:00:00.000Z'),
    updatedAt: new Date('2026-05-16T09:10:00.000Z'),
    process: { id: 7, title: 'Reclamatória Trabalhista Cliente Atlas', client: 'Cliente Atlas' },
    clientRecord: { id: 3, name: 'Cliente Atlas' },
    crmLead: { id: 18, personName: 'Cliente Atlas', status: 'novo' },
    crmOpportunity: null,
    capture: {
      id: 11,
      sourceType: 'cnj',
      sourceReference: 'CNJ-123',
      occurredAt: new Date('2026-05-16T08:00:00.000Z'),
      tribunal: 'TJSP',
      processNumber: '10000011120265020001',
      cpf: '12345678900',
      personName: 'Cliente Atlas',
      normalizedText: 'Sentença publicada com prazo recursal.',
      correlationId: 'corr-triage-9',
    },
    event: {
      id: 12,
      publicationId: 44,
      title: 'Sentença publicada',
      summary: 'Sentença com indício de prazo recursal.',
      riskLevel: 'critico',
      requiresAction: true,
      eventAt: new Date('2026-05-16T08:00:00.000Z'),
    },
  });

  assert.equal(payload.id, 9);
  assert.equal(payload.queueType, 'critica');
  assert.equal(payload.suggestedAction, 'criar_prazo');
  assert.equal(payload.aiConfidenceBand, 'alta');
  assert.equal(payload.processLabel, '#7');
  assert.equal(payload.client, 'Cliente Atlas');
  assert.equal(payload.capture.sourceType, 'cnj');
  assert.equal(payload.event.title, 'Sentença publicada');
  assert.equal(payload.correlationId, 'corr-triage-9');
  assert.equal(payload.originReference.captureId, 11);
  assert.equal(payload.originReference.publicationId, 44);
  assert.equal(payload.pipeline.status, 'triado');
  assert.equal(payload.pipeline.timeline.length, 2);
  assert.equal(payload.derivedActions.length, 1);
  assert.equal(payload.derivedActions[0].entityType, 'crm_lead');
  assert.equal(payload.fallbacks.length, 1);

  const decision = buildTriageDecisionPayload({
    id: 3,
    decisionType: 'confirmado',
    decisionReason: 'Prazo identificado',
    decisionNote: 'Confirmado pelo coordenador.',
    decidedBy: 'admin',
    decidedAt: new Date('2026-05-16T09:30:00.000Z'),
    generatedTaskId: 15,
    generatedDeadlineId: 22,
    generatedLeadId: null,
    generatedOpportunityId: null,
  });

  assert.equal(decision.decisionType, 'confirmado');
  assert.equal(decision.generatedDeadlineId, 22);
  assert.equal(decision.generatedTaskId, 15);
});
