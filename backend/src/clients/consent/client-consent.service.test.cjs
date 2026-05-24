const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const servicePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'clients', 'consent', 'client-consent.service.js');
const validatorPath = path.resolve(__dirname, '..', '..', '..', 'dist', 'clients', 'consent', 'client-consent.validators.js');

function createRepository(overrides = {}) {
  const state = {
    client: { id: 21, name: 'Atlas Holding', status: 'ativo' },
    latestConsent: null,
    ...overrides,
  };

  return {
    async findClientById(id) {
      return state.client && state.client.id === id ? { ...state.client } : null;
    },
    async findLatestConsentByClientId(clientId) {
      return state.latestConsent && state.latestConsent.clientId === clientId ? { ...state.latestConsent } : null;
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

test('validateClientConsentUpdateInput rejects invalid preferences payload', async () => {
  const { validateClientConsentUpdateInput } = require(validatorPath);

  assert.throws(
    () =>
      validateClientConsentUpdateInput({
        clientId: 21,
        preferences: { email: true, portal: true },
        legalBasis: 'consentimento',
        capturedAt: '2026-05-22T12:00:00.000Z',
        capturedBy: 'portal@cliente.com',
      }),
    (error) => {
      assert.equal(error.code, 'CONSENT_INVALID');
      return true;
    },
  );
});

test('ClientConsentService updates consent version and emits audit event', async () => {
  const { ClientConsentService } = require(servicePath);

  const auditService = createAuditService();
  const service = new ClientConsentService(createRepository(), auditService);
  const result = await service.update({
    clientId: 21,
    preferences: { email: true, whatsapp: false, portal: true },
    legalBasis: 'consentimento',
    capturedAt: '2026-05-22T12:00:00.000Z',
    capturedBy: 'portal@cliente.com',
  });

  assert.equal(result.clientId, 21);
  assert.equal(result.consentVersion, 1);
  assert.deepEqual(result.preferences, { email: true, whatsapp: false, portal: true });
  assert.equal(result.legalBasis, 'consentimento');
  assert.equal(auditService.events.length, 1);
});

test('ClientConsentService increments version from previous consent snapshot', async () => {
  const { ClientConsentService } = require(servicePath);

  const service = new ClientConsentService(
    createRepository({
      latestConsent: {
        clientId: 21,
        consentVersion: 4,
        preferences: { email: true, whatsapp: true, portal: true },
        legalBasis: 'execucao_contrato',
        capturedAt: '2026-05-20T10:00:00.000Z',
        capturedBy: 'operador@lexora.local',
        updatedAt: '2026-05-20T10:00:00.000Z',
      },
    }),
    createAuditService(),
  );

  const result = await service.update({
    clientId: 21,
    preferences: { email: true, whatsapp: true, portal: false },
    legalBasis: 'legitimo_interesse',
    capturedAt: '2026-05-22T12:00:00.000Z',
    capturedBy: 'comercial@lexora.local',
  });

  assert.equal(result.consentVersion, 5);
  assert.equal(result.preferences.portal, false);
  assert.equal(result.legalBasis, 'legitimo_interesse');
});

test('ClientConsentService returns latest consent snapshot', async () => {
  const { ClientConsentService } = require(servicePath);

  const latestConsent = {
    clientId: 21,
    consentVersion: 3,
    preferences: { email: true, whatsapp: false, portal: true },
    legalBasis: 'consentimento',
    capturedAt: '2026-05-21T09:00:00.000Z',
    capturedBy: 'operador@lexora.local',
    updatedAt: '2026-05-21T09:00:00.000Z',
  };

  const service = new ClientConsentService(
    createRepository({ latestConsent }),
    createAuditService(),
  );

  const result = await service.get(21);

  assert.deepEqual(result, latestConsent);
});
