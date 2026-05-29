const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'shared', 'company-scope', 'cross-tenant.guard.js');

test('isCompanyScopeAllowed returns true only for same company', async () => {
  const { isCompanyScopeAllowed } = require(modulePath);
  assert.equal(isCompanyScopeAllowed({ authenticatedCompanyId: '10', targetCompanyId: '10' }), true);
  assert.equal(isCompanyScopeAllowed({ authenticatedCompanyId: '10', targetCompanyId: '11' }), false);
});

test('assertCompanyScopeAllowed throws for cross-tenant access', async () => {
  const { assertCompanyScopeAllowed, CrossTenantAccessError } = require(modulePath);
  assert.throws(
    () => assertCompanyScopeAllowed({ authenticatedCompanyId: 'cmp-a', targetCompanyId: 'cmp-b' }),
    CrossTenantAccessError,
  );
});

