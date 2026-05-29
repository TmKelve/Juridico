const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const membershipModulePath = path.resolve(__dirname, '..', 'dist', 'platform', 'memberships', 'platform-membership.service.js');
const routesModulePath = path.resolve(__dirname, '..', 'dist', 'platform', 'memberships', 'register-platform-membership-routes.js');

function createFakeApp() {
  return {
    routes: [],
    get(path, handler) { this.routes.push({ method: 'GET', path, handler }); },
    post(path, handler) { this.routes.push({ method: 'POST', path, handler }); },
    delete(path, handler) { this.routes.push({ method: 'DELETE', path, handler }); },
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

test('platform-membership enforces plan metadata limit with fallback', async () => {
  const { PlatformMembershipService } = require(membershipModulePath);
  const service = new PlatformMembershipService({
    subscription: {
      findFirst: async () => ({ plan: { metadata: { limits: { memberships: 2 } } } }),
    },
    companyMembership: {
      count: async () => 2,
    },
  });

  await assert.rejects(() => service.enforceMembershipLimit(1), /Limite de colaboradores/);
});

test('platform-membership routes block non-platform user', async () => {
  const { registerPlatformMembershipRoutes } = require(routesModulePath);
  const app = createFakeApp();

  registerPlatformMembershipRoutes({
    app,
    prisma: {
      company: { findUnique: async () => ({ id: 1, status: 'active' }) },
      companyMembership: { findMany: async () => [] },
    },
    getUserFromReq: () => ({ sub: 1, email: 'tenant@x.com', role: 'company_admin', userType: 'operational' }),
  });

  const route = app.routes.find((item) => item.method === 'GET' && item.path === '/platform/memberships');
  assert.ok(route);
  const res = createResponse();
  await route.handler({ query: { companyId: '1' } }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, 'PLATFORM_PROFILE_REQUIRED');
});
