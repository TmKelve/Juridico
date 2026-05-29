const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const enforcerPath = path.resolve(__dirname, '..', 'dist', 'authz', 'company-status', 'company-status-authz-enforcer.js');

test('platform context bypasses tenant company restriction', async () => {
  const { enforceCompanyStatusForAuthorization } = require(enforcerPath);
  const result = enforceCompanyStatusForAuthorization({
    authzInput: {
      actor: { role: 'ADM' },
      context: { accessContext: 'platform' },
      permissionKey: 'task.update',
    },
    statusContext: {
      companyStatus: 'suspended',
    },
  });
  assert.equal(result.allowed, true);
});
