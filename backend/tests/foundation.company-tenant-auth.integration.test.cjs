const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const authClaimsPath = path.resolve(__dirname, '..', 'dist', 'auth', 'auth-claims.js');
const sessionAccessPath = path.resolve(__dirname, '..', 'dist', 'session', 'session-access.js');
const requestContextPath = path.resolve(
  __dirname,
  '..',
  'dist',
  'shared',
  'request-context',
  'company-request-context.js',
);
const queryScopePath = path.resolve(__dirname, '..', 'dist', 'shared', 'company-scope', 'query-scope.js');

test('auth -> session integra company/membership claims e permite acesso operacional ativo', async () => {
  const { createAuthTokenClaims } = require(authClaimsPath);
  const { resolveSessionContext, evaluateSessionAccess } = require(sessionAccessPath);

  const claims = createAuthTokenClaims({
    id: 101,
    email: 'adv@empresa-a.com',
    role: 'ADV',
    userType: 'operational',
    companyId: 11,
    membershipId: 501,
  });

  const session = resolveSessionContext({
    claims,
    company: { id: 11, status: 'ACTIVE' },
  });
  const decision = evaluateSessionAccess(session);

  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, 'SESSION_ALLOWED');
});

test('tenant isolation bloqueia claim fora da membership ativa', async () => {
  const { resolveCompanyRequestContext, CompanyRequestContextError } = require(requestContextPath);

  await assert.rejects(
    resolveCompanyRequestContext({
      claims: {
        sub: 202,
        role: 'ADV',
        email: 'adv@empresa-a.com',
        companyId: 99,
      },
      membershipPort: {
        async listActiveCompanyIdsByUser() {
          return ['11', '12'];
        },
      },
    }),
    (error) => {
      assert.ok(error instanceof CompanyRequestContextError);
      assert.equal(error.code, 'CROSS_TENANT_FORBIDDEN');
      return true;
    },
  );
});

test('tenant isolation aplica filtro autenticado e impede filtro cruzado', async () => {
  const { withCompanyScope } = require(queryScopePath);

  const scoped = withCompanyScope({ status: 'active' }, '11');
  assert.equal(scoped.companyId, '11');
  assert.equal(scoped.status, 'active');

  assert.throws(
    () => withCompanyScope({ companyId: '12', status: 'active' }, '11'),
    /Query scope denied: companyId filter is outside authenticated tenant./,
  );
});

