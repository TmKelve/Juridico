const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const repositoryModulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'timesheet', 'core', 'time-entry.repository.js');
const modulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'timesheet', 'http', 'register-timesheet-routes.js');

function createFakeApp() {
  return {
    routes: [],
    get(path, handler) {
      this.routes.push({ method: 'GET', path, handler });
    },
    post(path, handler) {
      this.routes.push({ method: 'POST', path, handler });
    },
    put(path, handler) {
      this.routes.push({ method: 'PUT', path, handler });
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

test('registerTimesheetRoutes creates and reports entries', async () => {
  const { InMemoryTimeEntryRepository } = require(repositoryModulePath);
  const { registerTimesheetRoutes } = require(modulePath);

  const app = createFakeApp();
  const repository = new InMemoryTimeEntryRepository();
  registerTimesheetRoutes({
    app,
    getUserFromReq: () => ({ sub: 1, role: 'ADM', email: 'admin@juridico.com' }),
    repository,
  });

  const createRoute = app.routes.find((route) => route.method === 'POST' && route.path === '/timesheet/entries');
  const reportRoute = app.routes.find((route) => route.method === 'GET' && route.path === '/timesheet/reports');
  assert.ok(createRoute);
  assert.ok(reportRoute);

  const createRes = createResponse();
  await createRoute.handler({
    body: {
      userId: 1,
      activityType: 'analise',
      source: 'manual',
      startedAt: '2026-05-26T09:00:00.000Z',
      endedAt: '2026-05-26T10:00:00.000Z',
      billable: true,
      billableMinutes: 60,
    },
  }, createRes);
  assert.equal(createRes.statusCode, 201);

  const reportRes = createResponse();
  await reportRoute.handler({
    query: {
      userId: '1',
      from: '2026-05-01',
      to: '2026-05-31',
    },
  }, reportRes);
  assert.equal(reportRes.statusCode, 200);
  assert.equal(reportRes.body.summary.totalMinutes, 60);
});
