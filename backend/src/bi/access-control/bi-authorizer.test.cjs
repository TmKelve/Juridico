const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'bi', 'access-control', 'bi-authorizer.js');

test('ensureBiAuthorized allows global BI view for FIN', async () => {
  const { ensureBiAuthorized } = require(modulePath);

  const decision = ensureBiAuthorized({
    actor: { userId: 3, role: 'FIN' },
    permissionKey: 'bi.view',
    scopeType: 'global',
    scopeId: 'global',
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.scope, 'global');
});
