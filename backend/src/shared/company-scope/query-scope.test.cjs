const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'shared', 'company-scope', 'query-scope.js');

test('withCompanyScope enforces authenticated companyId in where clause', async () => {
  const { withCompanyScope } = require(modulePath);

  const scoped = withCompanyScope({ status: 'open' }, 'cmp-44');
  assert.equal(scoped.companyId, 'cmp-44');
  assert.equal(scoped.status, 'open');
});

test('withCompanyScope blocks conflicting companyId filters', async () => {
  const { withCompanyScope } = require(modulePath);
  assert.throws(() => withCompanyScope({ companyId: 'cmp-other' }, 'cmp-1'));
});
