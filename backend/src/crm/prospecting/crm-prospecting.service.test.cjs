const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const servicePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'crm', 'prospecting', 'crm-prospecting.service.js');
const validatorPath = path.resolve(__dirname, '..', '..', '..', 'dist', 'crm', 'prospecting', 'crm-prospecting.validators.js');

function createRepository(overrides = {}) {
  const state = {
    client: null,
    hasActiveProcess: false,
    lead: null,
    createdLead: null,
    updatedLead: null,
    ...overrides,
  };

  return {
    async findClientByCpfCnpj(cpfCnpj) {
      return state.client && state.client.cpfCnpj === cpfCnpj ? { ...state.client } : null;
    },
    async hasActiveProcessByClientId(clientId) {
      return Boolean(state.client && state.client.id === clientId && state.hasActiveProcess);
    },
    async findLeadByCpfCnpj(cpfCnpj) {
      return state.lead && state.lead.cpf === cpfCnpj ? { ...state.lead } : null;
    },
    async createLead(data) {
      state.createdLead = {
        id: 301,
        clientId: data.clientId ?? null,
        cpf: data.cpf,
        personName: data.personName,
        source: data.source,
        status: data.status,
        summary: data.summary,
      };
      return { ...state.createdLead };
    },
    async updateLead(id, data) {
      state.updatedLead = {
        id,
        clientId: data.clientId ?? null,
        cpf: data.cpf,
        personName: data.personName,
        source: data.source,
        status: data.status,
        summary: data.summary,
      };
      return { ...state.updatedLead };
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

test('validateClientProspectSignalInput rejects invalid CPF/CNPJ', async () => {
  const { validateClientProspectSignalInput } = require(validatorPath);

  assert.throws(
    () =>
      validateClientProspectSignalInput({
        cpfCnpj: '123',
        personName: 'Contato',
        sourceType: 'manual',
        sourceReference: 'MANUAL-1',
        summary: 'Lead sem processo ativo',
        idempotencyKey: 'lead-1',
      }),
    (error) => {
      assert.equal(error.code, 'PROSPECT_INVALID_DOCUMENT');
      return true;
    },
  );
});

test('CrmProspectingService creates lead when there is no active process', async () => {
  const { CrmProspectingService } = require(servicePath);

  const auditService = createAuditService();
  const service = new CrmProspectingService(createRepository(), auditService);
  const result = await service.signal({
    cpfCnpj: '123.456.789-00',
    personName: 'Contato Atlas',
    sourceType: 'publicacao',
    sourceReference: 'PUB-1',
    summary: 'Publicação sem processo ativo na carteira.',
    idempotencyKey: 'lead-2',
  });

  assert.equal(result.prospectId, 301);
  assert.equal(result.leadId, 301);
  assert.equal(result.hasActiveProcess, false);
  assert.equal(auditService.events.length, 1);
});

test('CrmProspectingService avoids creating new lead when client already has active process', async () => {
  const { CrmProspectingService } = require(servicePath);

  const service = new CrmProspectingService(
    createRepository({
      client: { id: 91, name: 'Cliente Atlas', cpfCnpj: '12345678900', status: 'ativo' },
      hasActiveProcess: true,
    }),
    createAuditService(),
  );

  const result = await service.signal({
    cpfCnpj: '12345678900',
    personName: 'Cliente Atlas',
    sourceType: 'manual',
    sourceReference: 'MANUAL-2',
    summary: 'Cliente já identificado na carteira.',
    idempotencyKey: 'lead-3',
  });

  assert.equal(result.matchedClientId, 91);
  assert.equal(result.hasActiveProcess, true);
  assert.equal(result.leadId, null);
  assert.equal(result.prospectId, 91);
});
