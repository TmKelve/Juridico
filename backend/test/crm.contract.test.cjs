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
    correlationId: 'corr-crm-7',
    originReference: {
      correlationId: 'corr-crm-7',
      sourceType: 'diario',
      sourceReference: 'DJE-TJSP-2026-05-16-00007',
      originKind: 'publication',
      originLabel: 'DJE TJSP',
      originStage: 'gerou_crm',
      consolidationStatus: 'consolidado',
      captureId: 81,
      eventId: 141,
      publicationId: 14,
      evidenceUrl: '/publication-captures/81/evidence',
      publicationUrl: '/publications/14',
      timelineUrl: '/publication-pipeline/corr-crm-7',
    },
    pipelineStatus: 'gerou_crm',
    pipelineTimeline: [
      {
        id: 'capture-81',
        entityType: 'capture',
        entityId: 81,
        stage: 'capturado',
        title: 'Captura inicial',
        summary: 'Publicação capturada.',
        status: 'capturado',
        occurredAt: '2026-05-16T11:00:00.000Z',
        sourceType: 'diario',
        sourceReference: 'DJE-TJSP-2026-05-16-00007',
        link: '/publication-captures/81',
      },
      {
        id: 'lead-7',
        entityType: 'crm_lead',
        entityId: 7,
        stage: 'gerou_crm',
        title: 'Lead criado',
        summary: 'Lead operacional originado da publicação.',
        status: 'gerou_crm',
        occurredAt: '2026-05-16T12:00:00.000Z',
        sourceType: 'diario',
        sourceReference: 'DJE-TJSP-2026-05-16-00007',
        link: '/crm/leads/7',
      },
    ],
    derivedActions: [
      {
        entityType: 'triage',
        entityId: 9,
        correlationId: 'corr-crm-7',
        sourceType: 'diario',
        sourceReference: 'DJE-TJSP-2026-05-16-00007',
        originStage: 'triado',
        status: 'pendente',
        title: 'Triagem crítica associada',
        summary: 'Aguardando ação.',
        url: '/triage/9',
        createdAt: '2026-05-16T11:30:00.000Z',
      },
    ],
    fallbacks: [{ code: 'opportunity_not_created', message: 'Conversão em oportunidade ainda não executada.' }],
  });

  assert.equal(payload.client, 'Cliente Atlas');
  assert.equal(payload.triageCount, 1);
  assert.equal(payload.hasCriticalTriage, true);
  assert.equal(payload.responsible, 'advogado@juridico.com');
  assert.equal(payload.contactEvents.length, 1);
  assert.equal(payload.lastContactAt, '2026-05-16T12:15:00.000Z');
  assert.equal(payload.correlationId, 'corr-crm-7');
  assert.equal(payload.originReference.publicationId, 14);
  assert.equal(payload.pipeline.status, 'gerou_crm');
  assert.equal(payload.pipeline.timeline.length, 2);
  assert.equal(payload.derivedActions.length, 1);
  assert.equal(payload.fallbacks.length, 1);
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
    correlationId: 'corr-opp-11',
    pipelineStatus: 'gerou_crm',
  });

  assert.equal(payload.client, '');
  assert.equal(payload.convertedProcessId, 22);
  assert.equal(payload.triageCount, 0);
  assert.equal(payload.hasCriticalTriage, false);
  assert.equal(payload.responsible, '');
  assert.equal(payload.correlationId, 'corr-opp-11');
  assert.equal(payload.pipeline.status, 'gerou_crm');
});
