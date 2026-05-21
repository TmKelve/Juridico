const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const servicePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'crm', 'conversion', 'opportunity-conversion.service.js');
const validatorPath = path.resolve(__dirname, '..', '..', '..', 'dist', 'crm', 'conversion', 'opportunity-conversion.validators.js');

function createRepository(overrides = {}) {
  const state = {
    opportunity: {
      id: 17,
      clientId: null,
      convertedProcessId: null,
      cpf: '12345678900',
      personName: 'Contato Atlas',
      source: 'triagem',
      status: 'negociacao',
      responsible: 'comercial.atlas',
      summary: 'Cliente em negociação avançada.',
      nextContactAt: new Date('2026-05-22T10:00:00.000Z'),
      clientRecord: null,
      contactEvents: [],
    },
    processByNumber: null,
    linkedProcess: null,
    clientById: null,
    clientByCpf: null,
    clientByName: null,
    createdClient: null,
    updatedClient: null,
    createdProcess: null,
    updatedOpportunity: null,
    ...overrides,
  };

  return {
    async findOpportunityById(id) {
      return state.opportunity && state.opportunity.id === id ? { ...state.opportunity } : null;
    },
    async findProcessByNumber(processNumber) {
      return state.processByNumber && state.processByNumber.processNumber === processNumber ? { ...state.processByNumber } : null;
    },
    async findProcessById(id) {
      return state.linkedProcess && state.linkedProcess.id === id ? { ...state.linkedProcess } : null;
    },
    async findClientById(id) {
      return state.clientById && state.clientById.id === id ? { ...state.clientById } : null;
    },
    async findClientByCpfCnpj(cpfCnpj) {
      return state.clientByCpf && state.clientByCpf.cpfCnpj === cpfCnpj ? { ...state.clientByCpf } : null;
    },
    async findClientByName(name) {
      return state.clientByName && state.clientByName.name === name ? { ...state.clientByName } : null;
    },
    async createClient(data) {
      state.createdClient = {
        id: 44,
        name: data.name,
        status: data.status,
        cpfCnpj: data.cpfCnpj,
        legalArea: data.legalArea,
        responsible: data.responsible,
        type: data.type,
        notes: data.notes,
      };

      return { ...state.createdClient };
    },
    async updateClient(id, data) {
      state.updatedClient = {
        id,
        name: state.clientById?.name || state.clientByCpf?.name || state.clientByName?.name || 'Cliente Atlas',
        status: data.status || 'ativo',
        cpfCnpj: data.cpfCnpj ?? null,
        legalArea: data.legalArea ?? null,
        responsible: data.responsible ?? null,
      };

      return { ...state.updatedClient };
    },
    async runInTransaction(callback) {
      return callback({
        async createProcess(data) {
          state.createdProcess = {
            id: 903,
            title: data.title,
            processNumber: data.processNumber,
            client: 'Cliente Atlas',
            clientId: data.clientId,
            phase: data.phase,
            status: data.status,
            ownerId: data.ownerId,
          };

          return { ...state.createdProcess };
        },
        async updateOpportunityAfterConversion(data) {
          state.updatedOpportunity = {
            ...state.opportunity,
            clientId: data.clientId,
            convertedProcessId: data.convertedProcessId,
            personName: data.personName,
            status: data.status,
            summary: data.summary,
            contactEvents: [...(state.opportunity.contactEvents || []), data.contactEvent],
          };

          return { ...state.updatedOpportunity };
        },
      });
    },
  };
}

test('validateOpportunityConversionCommand rejects missing confirmation', async () => {
  const { validateOpportunityConversionCommand } = require(validatorPath);

  assert.throws(
    () =>
      validateOpportunityConversionCommand({
        opportunityId: 17,
        clientName: 'Cliente Atlas',
        processTitle: 'Ação de Cobrança Atlas',
        processPhase: 'Conhecimento',
        processStatus: 'ativo',
        actor: { sub: 9, email: 'advogado@juridico.com', role: 'ADV' },
      }),
    (error) => {
      assert.equal(error.code, 'CRM_CONVERSION_CONFIRMATION_REQUIRED');
      return true;
    },
  );
});

test('CrmOpportunityConversionService converts opportunity and creates client/process when needed', async () => {
  const { CrmOpportunityConversionService } = require(servicePath);

  const service = new CrmOpportunityConversionService(createRepository());
  const result = await service.execute({
    opportunityId: 17,
    confirmConversion: true,
    clientName: 'Cliente Atlas',
    processTitle: 'Ação de Cobrança Atlas',
    processPhase: 'Conhecimento',
    processStatus: 'ativo',
    processNumber: '10024567820265020001',
    summary: 'Convertida após aceite comercial.',
    actor: { sub: 9, email: 'advogado@juridico.com', role: 'ADV' },
  });

  assert.equal(result.outcome, 'converted');
  assert.equal(result.idempotent, false);
  assert.equal(result.client.id, 44);
  assert.equal(result.process.id, 903);
  assert.equal(result.process.processNumber, '10024567820265020001');
  assert.equal(result.opportunity.convertedProcessId, 903);
  assert.equal(result.opportunity.status, 'ganha');
  assert.equal(result.opportunity.contactEvents[0].kind, 'conversao');
});

test('CrmOpportunityConversionService rejects duplicate process number before mutating data', async () => {
  const { CrmOpportunityConversionService } = require(servicePath);

  const service = new CrmOpportunityConversionService(
    createRepository({
      processByNumber: {
        id: 88,
        title: 'Processo existente',
        processNumber: '10024567820265020001',
        client: 'Cliente Existente',
        clientId: 12,
        phase: 'Conhecimento',
        status: 'ativo',
        ownerId: 1,
      },
    }),
  );

  await assert.rejects(
    () =>
      service.execute({
        opportunityId: 17,
        confirmConversion: true,
        clientName: 'Cliente Atlas',
        processTitle: 'Ação de Cobrança Atlas',
        processPhase: 'Conhecimento',
        processStatus: 'ativo',
        processNumber: '10024567820265020001',
        actor: { sub: 9, email: 'advogado@juridico.com', role: 'ADV' },
      }),
    (error) => {
      assert.equal(error.code, 'CRM_PROCESS_NUMBER_ALREADY_EXISTS');
      return true;
    },
  );
});

test('CrmOpportunityConversionService returns idempotent result when opportunity is already converted', async () => {
  const { CrmOpportunityConversionService } = require(servicePath);

  const service = new CrmOpportunityConversionService(
    createRepository({
      opportunity: {
        id: 17,
        clientId: 44,
        convertedProcessId: 903,
        cpf: '12345678900',
        personName: 'Cliente Atlas',
        source: 'triagem',
        status: 'ganha',
        responsible: 'comercial.atlas',
        summary: 'Já convertida.',
        nextContactAt: new Date('2026-05-22T10:00:00.000Z'),
        clientRecord: {
          id: 44,
          name: 'Cliente Atlas',
          status: 'ativo',
        },
        contactEvents: [],
      },
      linkedProcess: {
        id: 903,
        title: 'Ação de Cobrança Atlas',
        processNumber: '10024567820265020001',
        client: 'Cliente Atlas',
        clientId: 44,
        phase: 'Conhecimento',
        status: 'ativo',
        ownerId: 7,
      },
    }),
  );

  const result = await service.execute({
    opportunityId: 17,
    confirmConversion: true,
    clientName: 'Cliente Atlas',
    processTitle: 'Ação de Cobrança Atlas',
    processPhase: 'Conhecimento',
    processStatus: 'ativo',
    processNumber: '10024567820265020001',
    actor: { sub: 9, email: 'advogado@juridico.com', role: 'ADV' },
  });

  assert.equal(result.outcome, 'already_converted');
  assert.equal(result.idempotent, true);
  assert.equal(result.process.id, 903);
});
