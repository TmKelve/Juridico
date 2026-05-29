const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const enforcerPath = path.resolve(__dirname, '..', '..', '..', 'dist', 'authz', 'company-status', 'company-status-authz-enforcer.js');

test('status enforcer blocks tenant write under read_only', async () => {
  const { enforceCompanyStatusForAuthorization } = require(enforcerPath);
  const decision = enforceCompanyStatusForAuthorization({
    authzInput: {
      actor: { userId: 1, role: 'ADV' },
      permissionKey: 'task.update',
      resourceType: 'task',
      context: { accessContext: 'tenant' },
    },
    statusContext: { companyStatus: 'read_only' },
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'AUTHZ_DENIED_COMPANY_STATUS:STATUS_BLOCKED_READ_ONLY_WRITE');
});

test('status enforcer allows platform admin regardless of company status', async () => {
  const { enforceCompanyStatusForAuthorization } = require(enforcerPath);
  const decision = enforceCompanyStatusForAuthorization({
    authzInput: {
      actor: { userId: 2, role: 'platform_admin' },
      permissionKey: 'task.update',
      resourceType: 'task',
      context: { accessContext: 'platform' },
    },
    statusContext: { companyStatus: 'cancelled' },
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, 'PLATFORM_BYPASS_COMPANY_STATUS');
});
