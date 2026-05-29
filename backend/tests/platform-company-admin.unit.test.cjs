const test = require('node:test');
const assert = require('node:assert/strict');

test('platform-company-admin unit: enforce fine-grained permissions', async () => {
  const { ensurePlatformCompanyPermission, PlatformCompanyAccessError } = require('../dist/platform/company-admin/index.js');

  assert.doesNotThrow(() => ensurePlatformCompanyPermission('platform_support', 'list'));
  assert.throws(
    () => ensurePlatformCompanyPermission('platform_support', 'cancel'),
    (error) => error instanceof PlatformCompanyAccessError && error.code === 'PLATFORM_COMPANY_SUPPORT_READ_ONLY',
  );
  assert.throws(
    () => ensurePlatformCompanyPermission('platform_billing', 'block'),
    (error) => error instanceof PlatformCompanyAccessError && error.code === 'PLATFORM_COMPANY_BILLING_ACTION_DENIED',
  );
  assert.doesNotThrow(() => ensurePlatformCompanyPermission('platform_admin', 'block'));
});

test('platform-company-admin unit: require reason for block/cancel/reactivate', async () => {
  const { validateStatusActionInput, PlatformCompanyContractError } = require('../dist/platform/company-management/index.js');

  assert.throws(
    () => validateStatusActionInput({ companyId: 10, action: 'block', reason: '   ' }),
    (error) => error instanceof PlatformCompanyContractError && error.code === 'PLATFORM_COMPANY_REASON_REQUIRED',
  );

  const parsed = validateStatusActionInput({ companyId: '10', action: 'cancel', reason: 'inadimplencia' });
  assert.equal(parsed.companyId, 10);
  assert.equal(parsed.reason, 'inadimplencia');
});

