const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const enforcementPath = path.resolve(__dirname, '..', '..', 'dist', 'permissions', 'enforcement.js');

test('enforcement blocks mixed context usage', async () => {
  const { enforcePermissionContext } = require(enforcementPath);

  const result = enforcePermissionContext({
    role: 'platform_admin',
    targetContext: 'tenant',
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'AUTHZ_CONTEXT_MISMATCH');
});

test('enforcement allows mapped legacy tenant roles', async () => {
  const { enforcePermissionContext } = require(enforcementPath);

  const result = enforcePermissionContext({
    role: 'ADM',
    targetContext: 'tenant',
  });

  assert.equal(result.allowed, true);
  assert.equal(result.role, 'company_admin');
  assert.equal(result.resolvedContext, 'tenant');
});

