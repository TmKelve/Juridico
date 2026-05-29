const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const routeModulePath = path.resolve(__dirname, '..', 'dist', 'platform', 'invitations', 'register-platform-invitations-routes.js');

function createFakeApp() {
  return {
    routes: [],
    get(path, handler) { this.routes.push({ method: 'GET', path, handler }); },
    post(path, handler) { this.routes.push({ method: 'POST', path, handler }); },
  };
}

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

test('platform-invitations routes create and list invitation history', async () => {
  const { registerPlatformInvitationRoutes } = require(routeModulePath);
  const app = createFakeApp();

  let eventId = 500;
  const events = [];

  const prisma = {
    company: { findUnique: async () => ({ id: 1, status: 'active' }) },
    subscription: { findFirst: async () => ({ plan: { metadata: { maxCollaborators: 10 } } }) },
    companyMembership: {
      count: async () => 1,
      upsert: async ({ create }) => ({ id: 77, companyId: create.companyId, userId: create.userId, role: create.role, active: true }),
    },
    billingEvent: {
      create: async ({ data }) => {
        const row = { id: eventId++, createdAt: new Date('2026-05-27T10:00:00.000Z'), occurredAt: new Date('2026-05-27T10:00:00.000Z'), ...data };
        events.push(row);
        return row;
      },
      findUnique: async ({ where }) => events.find((item) => item.id === where.id) ?? null,
      findMany: async () => [...events].reverse(),
    },
  };

  registerPlatformInvitationRoutes({
    app,
    prisma,
    getUserFromReq: () => ({ sub: 10, email: 'platform@juridico.com', role: 'platform_admin', userType: 'platform' }),
  });

  const inviteRoute = app.routes.find((item) => item.method === 'POST' && item.path === '/platform/invitations');
  const acceptRoute = app.routes.find((item) => item.method === 'POST' && item.path === '/platform/invitations/:id/accept');
  const historyRoute = app.routes.find((item) => item.method === 'GET' && item.path === '/platform/invitations/history');

  assert.ok(inviteRoute);
  assert.ok(acceptRoute);
  assert.ok(historyRoute);

  const inviteRes = createResponse();
  await inviteRoute.handler({ body: { companyId: 1, email: 'novo@cliente.com', role: 'assistant' } }, inviteRes);
  assert.equal(inviteRes.statusCode, 201);
  assert.equal(inviteRes.body.state, 'pending');

  const acceptRes = createResponse();
  await acceptRoute.handler({ params: { id: String(inviteRes.body.invitationId) }, body: { companyId: 1, userId: 99 } }, acceptRes);
  assert.equal(acceptRes.statusCode, 200);
  assert.equal(acceptRes.body.membershipId, 77);

  const historyRes = createResponse();
  await historyRoute.handler({ query: { companyId: '1' } }, historyRes);
  assert.equal(historyRes.statusCode, 200);
  assert.ok(Array.isArray(historyRes.body.items));
  assert.ok(historyRes.body.items.length >= 2);
});
