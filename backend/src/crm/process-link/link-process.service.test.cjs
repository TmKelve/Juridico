const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const servicePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'crm', 'process-link', 'link-process.service.js');
const validatorPath = path.resolve(__dirname, '..', '..', '..', 'dist', 'crm', 'process-link', 'link-process.validators.js');

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
      contactEvents: [],
    },
    process: {
      id: 903,
      title: 'Ação de Cobrança Atlas',
      processNumber: '10024567820265020001',
      client: 'Cliente Atlas',
      clientId: 44,
      phase: 'Conhecimento',
      status: 'ativo',
      ownerId: 7,
      clientRecord: {
        id: 44,
        name: 'Cliente Atlas',
        status: 'ativo',
      },
    },
    ...overrides,
  };

  return {
    async findOpportunityById(id) {
      return state.opportunity && state.opportunity.id === id ? { ...state.opportunity } : null;
    },
    async findProcessById(id) {
      return state.process && state.process.id === id ? { ...state.process } : null;
    },
    async linkOpportunityToProcess(update) {
      state.opportunity = {
        ...state.opportunity,
        clientId: update.clientId,
        convertedProcessId: update.processId,
        personName: update.personName,
        status: update.status,
        summary: update.summary,
        contactEvents: [...(state.opportunity.contactEvents || []), update.contactEvent],
      };

      return { ...state.opportunity };
    },
  };
}

test('validateLinkProcessCommand rejects missing confirmation', async () => {
  const { validateLinkProcessCommand } = require(validatorPath);

  assert.throws(
    () =>
      validateLinkProcessCommand({
        opportunityId: 17,
        processId: 903,
        actor: { sub: 9, email: 'advogado@juridico.com', role: 'ADV' },
      }),
    (error) => {
      assert.equal(error.code, 'CRM_LINK_CONFIRMATION_REQUIRED');
      return true;
    },
  );
});

test('CrmOpportunityProcessLinkService links an eligible opportunity to an existing process', async () => {
  const { CrmOpportunityProcessLinkService } = require(servicePath);

  const service = new CrmOpportunityProcessLinkService(createRepository());
  const result = await service.execute({
    opportunityId: 17,
    processId: 903,
    confirmLink: true,
    summary: 'Vinculada após validação documental.',
    actor: { sub: 9, email: 'advogado@juridico.com', role: 'ADV' },
  });

  assert.equal(result.outcome, 'linked');
  assert.equal(result.idempotent, false);
  assert.equal(result.opportunity.convertedProcessId, 903);
  assert.equal(result.opportunity.clientId, 44);
  assert.equal(result.opportunity.personName, 'Cliente Atlas');
  assert.equal(result.opportunity.status, 'ganha');
  assert.equal(result.opportunity.contactEvents[0].kind, 'vinculo_processo');
});

test('CrmOpportunityProcessLinkService returns idempotent result when already linked to the same process', async () => {
  const { CrmOpportunityProcessLinkService } = require(servicePath);

  const service = new CrmOpportunityProcessLinkService(
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
        contactEvents: [],
      },
    }),
  );

  const result = await service.execute({
    opportunityId: 17,
    processId: 903,
    confirmLink: true,
    actor: { sub: 9, email: 'advogado@juridico.com', role: 'ADV' },
  });

  assert.equal(result.outcome, 'already_linked');
  assert.equal(result.idempotent, true);
  assert.equal(result.opportunity.convertedProcessId, 903);
});

test('CrmOpportunityProcessLinkService rejects link when opportunity is already tied to another process', async () => {
  const { CrmOpportunityProcessLinkService } = require(servicePath);

  const service = new CrmOpportunityProcessLinkService(
    createRepository({
      opportunity: {
        id: 17,
        clientId: 44,
        convertedProcessId: 1001,
        cpf: '12345678900',
        personName: 'Cliente Atlas',
        source: 'triagem',
        status: 'ganha',
        responsible: 'comercial.atlas',
        summary: 'Já convertida.',
        nextContactAt: new Date('2026-05-22T10:00:00.000Z'),
        contactEvents: [],
      },
    }),
  );

  await assert.rejects(
    () =>
      service.execute({
        opportunityId: 17,
        processId: 903,
        confirmLink: true,
        actor: { sub: 9, email: 'advogado@juridico.com', role: 'ADV' },
      }),
    (error) => {
      assert.equal(error.code, 'CRM_OPPORTUNITY_ALREADY_LINKED');
      return true;
    },
  );
});
