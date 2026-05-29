const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const matrixPath = path.resolve(__dirname, '..', '..', 'dist', 'permissions', 'matrix.js');
const rolesPath = path.resolve(__dirname, '..', '..', 'dist', 'roles', 'roles.js');

test('permission matrix keeps legacy compatibility via role mapping', async () => {
  const { listRoleGrants } = require(matrixPath);
  const { resolveRole } = require(rolesPath);

  const adv = resolveRole('ADV');
  assert.equal(adv.role, 'lawyer');
  assert.equal(adv.context, 'tenant');

  const fin = resolveRole('FIN');
  assert.equal(fin.role, 'company_finance');
  assert.equal(fin.context, 'tenant');

  const advGrants = listRoleGrants(adv.role, adv.context).map((item) => item.permissionKey);
  const finGrants = listRoleGrants(fin.role, fin.context).map((item) => item.permissionKey);

  assert.ok(advGrants.includes('task.update'));
  assert.ok(finGrants.includes('export.productivity'));
});

test('tenant and platform matrices stay context-separated', async () => {
  const { listRoleGrants } = require(matrixPath);

  const platformGrants = listRoleGrants('platform_support', 'platform').map((item) => item.permissionKey);
  const tenantGrants = listRoleGrants('assistant', 'tenant').map((item) => item.permissionKey);

  assert.ok(platformGrants.includes('task.view'));
  assert.ok(!platformGrants.includes('task.update'));
  assert.ok(tenantGrants.includes('task.update'));
});

