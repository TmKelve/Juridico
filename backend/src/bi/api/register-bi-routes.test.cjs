const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const routeModulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'bi', 'api', 'register-bi-routes.js');

function createFakeApp() {
  return {
    routes: [],
    get(path, handler) {
      this.routes.push({ method: 'GET', path, handler });
    },
    post(path, handler) {
      this.routes.push({ method: 'POST', path, handler });
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

test('registerBiRoutes wires metric query and export routes', async () => {
  const { registerBiRoutes } = require(routeModulePath);
  const app = createFakeApp();

  registerBiRoutes({
    app,
    getUserFromReq: () => ({ sub: 3, role: 'FIN', email: 'fin@juridico.com' }),
    productivityService: { buildMetrics: () => [{ metricKey: 'productivity.tasks.completed', label: 'x', value: 1, delta: null, series: [], definitionVersion: 'l-v1', snapshotId: null }] },
    financeService: { buildMetrics: () => [{ metricKey: 'finance.cashflow.net_cents', label: 'y', value: 2, delta: null, series: [], definitionVersion: 'l-v1', snapshotId: null }] },
    snapshotService: { store: async () => [{ id: 'snap-1' }] },
    exportService: { generate: async () => ({ id: 'exp-1', format: 'csv' }) },
  });

  const metricsRoute = app.routes.find((route) => route.method === 'POST' && route.path === '/bi/metrics/query');
  const exportRoute = app.routes.find((route) => route.method === 'POST' && route.path === '/bi/exports');
  assert.ok(metricsRoute);
  assert.ok(exportRoute);

  const metricsRes = createResponse();
  await metricsRoute.handler({
    body: {
      scopeType: 'global',
      scopeId: 'global',
      from: '2026-05-01',
      to: '2026-05-31',
      productivitySnapshots: [],
      financeSnapshots: [],
    },
  }, metricsRes);
  assert.equal(metricsRes.statusCode, 200);
  assert.equal(metricsRes.body.items.length, 2);

  const exportRes = createResponse();
  await exportRoute.handler({
    body: {
      scopeType: 'global',
      scopeId: 'global',
      dashboardKey: 'financial_consolidated',
      format: 'csv',
    },
  }, exportRes);
  assert.equal(exportRes.statusCode, 201);
  assert.equal(exportRes.body.exportJob.id, 'exp-1');
});
