const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const servicePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'clients', 'portal', 'client-portal.service.js');

function createRepository(overrides = {}) {
  const state = {
    client: { id: 5, name: 'Metalurgica Atlas', status: 'ativo' },
    activeProcesses: 3,
    pendingDocuments: 2,
    recentPublications: 4,
    documentCards: [
      { documentId: 71, processId: 10, title: 'Contrato Social', status: 'pendente', category: 'Cliente', uploadedAt: '2026-05-22T10:00:00.000Z' },
    ],
    publicationCards: [
      { publicationId: 81, processId: 10, title: 'Publicação de andamento', status: 'nova', publishedAt: '2026-05-22T09:00:00.000Z', requiresAction: true },
    ],
    deadlineCards: [
      { deadlineId: 91, processId: 10, title: 'Prazo recursal', status: 'aberto', dueDate: '2026-05-25T12:00:00.000Z', priority: 'alta' },
    ],
    ...overrides,
  };

  return {
    async findClientById(id) {
      return state.client && state.client.id === id ? { ...state.client } : null;
    },
    async countActiveProcesses() {
      return state.activeProcesses;
    },
    async countPendingDocuments() {
      return state.pendingDocuments;
    },
    async countRecentPublications() {
      return state.recentPublications;
    },
    async listDocumentCards() {
      return state.documentCards.map((item) => ({ ...item }));
    },
    async listPublicationCards() {
      return state.publicationCards.map((item) => ({ ...item }));
    },
    async listDeadlineCards() {
      return state.deadlineCards.map((item) => ({ ...item }));
    },
  };
}

test('ClientPortalService aggregates summary, cards and timeline', async () => {
  const { ClientPortalService } = require(servicePath);

  const service = new ClientPortalService(createRepository());
  const result = await service.fetch({
    clientId: 5,
    includeDocuments: true,
    includePublications: true,
    includeDeadlines: true,
  });

  assert.equal(result.clientId, 5);
  assert.equal(result.summary.activeProcesses, 3);
  assert.equal(result.summary.pendingDocuments, 2);
  assert.equal(result.summary.recentPublications, 4);
  assert.equal(result.cards.documents.length, 1);
  assert.equal(result.cards.publications.length, 1);
  assert.equal(result.cards.deadlines.length, 1);
  assert.equal(result.timeline.length, 3);
  assert.equal(result.timeline[0].entityType, 'document');
});

test('ClientPortalService omits optional cards when include flags are false', async () => {
  const { ClientPortalService } = require(servicePath);

  const service = new ClientPortalService(createRepository());
  const result = await service.fetch({
    clientId: 5,
    includeDocuments: false,
    includePublications: true,
    includeDeadlines: false,
  });

  assert.deepEqual(result.cards.documents, []);
  assert.equal(result.cards.publications.length, 1);
  assert.deepEqual(result.cards.deadlines, []);
  assert.equal(result.timeline.length, 1);
});
