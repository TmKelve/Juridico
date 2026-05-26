const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'ai', 'http', 'register-ai-routes.js');

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

test('registerAiRoutes wires summary and audit endpoints', async () => {
  const { registerAiRoutes } = require(modulePath);
  const app = createFakeApp();
  registerAiRoutes({
    app,
    getUserFromReq: () => ({ sub: 1, role: 'ADM', email: 'admin@juridico.com' }),
  });

  const summaryRoute = app.routes.find((route) => route.method === 'POST' && route.path === '/ai/summary');
  const auditRoute = app.routes.find((route) => route.method === 'GET' && route.path === '/ai/audit');
  assert.ok(summaryRoute);
  assert.ok(auditRoute);

  const res = createResponse();
  await summaryRoute.handler({
    body: {
      targetType: 'publication',
      targetId: 11,
      sourceText: 'Intimacao para manifestacao em 48 horas.',
    },
  }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.meta.provider, 'deterministic-fallback');
});
