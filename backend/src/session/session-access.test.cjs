const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const sessionAccessPath = path.resolve(__dirname, '..', '..', 'dist', 'session', 'session-access.js');

test('session denies platform user without company context', async () => {
  const { resolveSessionContext, evaluateSessionAccess } = require(sessionAccessPath);
  const session = resolveSessionContext({
    claims: {
      sub: 7,
      email: 'platform@juridico.com',
      role: 'PLATFORM_ADMIN',
      userType: 'platform',
      companyId: null,
      membershipId: null,
    },
  });

  const decision = evaluateSessionAccess(session);
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'SESSION_DENIED_COMPANY_CONTEXT_REQUIRED');
});

test('session denies operational access when company status is not active', async () => {
  const { resolveSessionContext, evaluateSessionAccess } = require(sessionAccessPath);
  const session = resolveSessionContext({
    claims: {
      sub: 12,
      email: 'advogado@juridico.com',
      role: 'ADV',
      userType: 'operational',
      companyId: 99,
      membershipId: 333,
    },
    company: { id: 99, status: 'SUSPENDED' },
  });

  const decision = evaluateSessionAccess(session);
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'SESSION_DENIED_COMPANY_NOT_ACTIVE');
  assert.equal(decision.companyStatus, 'SUSPENDED');
});

test('session allows operational user when company is active', async () => {
  const { resolveSessionContext, evaluateSessionAccess } = require(sessionAccessPath);
  const session = resolveSessionContext({
    claims: {
      sub: 21,
      email: 'atendimento@juridico.com',
      role: 'ATD',
      userType: 'operational',
      companyId: 555,
      membershipId: 987,
    },
    company: { id: 555, status: 'ACTIVE' },
  });

  const decision = evaluateSessionAccess(session);
  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, 'SESSION_ALLOWED');
  assert.equal(decision.companyStatus, 'ACTIVE');
});
