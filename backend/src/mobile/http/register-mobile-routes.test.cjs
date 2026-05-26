const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const repositoryModulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'timesheet', 'core', 'time-entry.repository.js');
const modulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'mobile', 'http', 'register-mobile-routes.js');

function createFakeApp() {
  return {
    routes: [],
    get(path, handler) {
      this.routes.push({ method: 'GET', path, handler });
    },
  };
}

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('registerMobileRoutes returns consolidated mobile feed', async () => {
  const { InMemoryTimeEntryRepository } = require(repositoryModulePath);
  const { registerMobileRoutes } = require(modulePath);

  const app = createFakeApp();
  const repository = new InMemoryTimeEntryRepository({
    entries: [{
      id: 'entry-1',
      userId: 1,
      teamId: null,
      portfolioId: null,
      clientId: null,
      processId: null,
      taskId: null,
      attendanceId: null,
      agendaEventId: null,
      activityType: 'analise',
      source: 'manual',
      status: 'draft',
      billable: true,
      durationMinutes: 60,
      billableMinutes: 60,
      startedAt: '2026-05-26T09:00:00.000Z',
      endedAt: '2026-05-26T10:00:00.000Z',
      notes: null,
      origin: 'manual',
      createdByUserId: 1,
      approvedByUserId: null,
      approvedAt: null,
      lockedAt: null,
      correlationId: null,
      idempotencyKey: null,
      createdAt: '2026-05-26T10:00:00.000Z',
      updatedAt: '2026-05-26T10:00:00.000Z',
    }],
  });

  registerMobileRoutes({
    app,
    prisma: {
      task: { findMany: async () => [] },
      prazo: { findMany: async () => [] },
      agendaEvent: { findMany: async () => [] },
    },
    getUserFromReq: () => ({ sub: 1, role: 'ADM', email: 'admin@juridico.com' }),
    repository,
  });

  const route = app.routes.find((item) => item.method === 'GET' && item.path === '/mobile/feed');
  assert.ok(route);

  const res = createResponse();
  await route.handler({ query: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.items.length, 1);
  assert.equal(res.body.items[0].type, 'timesheet_pending');
});
