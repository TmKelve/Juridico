const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const servicePath = path.resolve(__dirname, '..', '..', 'dist', 'communication', 'communication.service.js');

function createRepository(overrides = {}) {
  const state = {
    client: { id: 8, name: 'Cliente Atlas', status: 'ativo', email: 'contato@atlas.com' },
    consent: {
      clientId: 8,
      consentVersion: 2,
      preferences: { email: true, whatsapp: false, portal: true },
      legalBasis: 'consentimento',
      capturedAt: '2026-05-21T10:00:00.000Z',
      capturedBy: 'portal@atlas.com',
      updatedAt: '2026-05-21T10:00:00.000Z',
    },
    history: [],
    ...overrides,
  };

  return {
    async findClientById(id) {
      return state.client && state.client.id === id ? { ...state.client } : null;
    },
    async findLatestConsentByClientId(clientId) {
      return state.consent && state.consent.clientId === clientId ? { ...state.consent } : null;
    },
    async listCommunicationHistory(clientId, channel, limit) {
      return state.history
        .filter((item) => item.clientId === clientId && (channel === 'all' || item.channel === channel))
        .slice(0, limit)
        .map((item) => ({ ...item }));
    },
  };
}

function createAuditService() {
  const events = [];
  return {
    events,
    async record(input) {
      events.push(input);
      return { id: `audit-${events.length}`, ...input };
    },
    async runIdempotent(input) {
      const data = await input.execute();
      return { mode: 'created', data, idempotencyKey: input.key ?? null };
    },
  };
}

function createDispatcher(result = { deliveryStatus: 'queued', retryCount: 0, providerMessageId: 'provider-1' }) {
  return {
    async dispatch() {
      return { ...result };
    },
  };
}

test('ClientCommunicationService blocks channel without consent', async () => {
  const { ClientCommunicationService } = require(servicePath);

  const service = new ClientCommunicationService(
    createRepository(),
    createAuditService(),
    createDispatcher(),
  );

  await assert.rejects(
    () =>
      service.send({
        clientId: 8,
        channel: 'whatsapp',
        subject: null,
        message: 'Atualização do seu caso.',
        templateCode: null,
        contextEntityType: 'process',
        contextEntityId: 10,
        idempotencyKey: 'comm-1',
      }),
    (error) => {
      assert.equal(error.code, 'COMMUNICATION_CONSENT_REQUIRED');
      return true;
    },
  );
});

test('ClientCommunicationService sends communication and records audit history', async () => {
  const { ClientCommunicationService } = require(servicePath);

  const auditService = createAuditService();
  const service = new ClientCommunicationService(createRepository(), auditService, createDispatcher());
  const result = await service.send({
    clientId: 8,
    channel: 'email',
    subject: 'Checklist pendente',
    message: 'Envio do checklist atualizado.',
    templateCode: 'checklist-pendente',
    contextEntityType: 'document',
    contextEntityId: 11,
    idempotencyKey: 'comm-2',
  });

  assert.match(result.communicationId, /^comm_/);
  assert.equal(result.deliveryStatus, 'queued');
  assert.equal(result.retryCount, 0);
  assert.equal(auditService.events.length, 1);
});

test('ClientCommunicationService returns communication history filtered by channel', async () => {
  const { ClientCommunicationService } = require(servicePath);

  const service = new ClientCommunicationService(
    createRepository({
      history: [
        {
          clientId: 8,
          communicationId: 'comm_1',
          channel: 'email',
          status: 'sent',
          sentAt: '2026-05-22T12:00:00.000Z',
          deliveredAt: null,
          summary: 'Email enviado',
        },
        {
          clientId: 8,
          communicationId: 'comm_2',
          channel: 'portal',
          status: 'delivered',
          sentAt: '2026-05-22T12:30:00.000Z',
          deliveredAt: '2026-05-22T12:30:00.000Z',
          summary: 'Mensagem publicada no portal',
        },
      ],
    }),
    createAuditService(),
    createDispatcher(),
  );

  const result = await service.history({ clientId: 8, channel: 'portal', limit: 10 });
  assert.equal(result.clientId, 8);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].communicationId, 'comm_2');
});
