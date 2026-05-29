const test = require('node:test');
const assert = require('node:assert/strict');

test('CompanyDomainService creates company, updates status and manages membership role', async () => {
  const {
    CompanyDomainService,
    InMemoryCompanyDomainRepository,
  } = require('../../dist/company/index.js');

  const repository = new InMemoryCompanyDomainRepository();
  const service = new CompanyDomainService(repository);

  const company = await service.createCompany({
    name: 'Lexora',
    slug: 'lexora',
    status: 'active',
  });
  assert.equal(company.slug, 'lexora');

  const statusUpdated = await service.updateCompanyStatus({
    companyId: company.id,
    status: 'grace_period',
  });
  assert.equal(statusUpdated.status, 'grace_period');

  const membership = await service.createCompanyMembership({
    companyId: company.id,
    userId: 10,
    role: 'owner',
    active: true,
  });
  assert.equal(membership.role, 'owner');

  const membershipRoleUpdated = await service.updateCompanyMembershipRole({
    companyId: company.id,
    userId: 10,
    role: 'admin',
  });
  assert.equal(membershipRoleUpdated.role, 'admin');
});

test('Company validators reject invalid status and invalid ids', async () => {
  const {
    CompanyContractError,
    validateCreateCompanyInput,
    validateUpdateCompanyStatusInput,
  } = require('../../dist/company/index.js');

  assert.throws(
    () => validateCreateCompanyInput({ name: 'Lexora', slug: 'lexora', status: 'wrong_status' }),
    (error) => error instanceof CompanyContractError && error.code === 'COMPANY_INVALID_STATUS',
  );

  assert.throws(
    () => validateUpdateCompanyStatusInput({ companyId: 0, status: 'active' }),
    (error) => error instanceof CompanyContractError && error.code === 'COMPANY_INVALID_NUMBER',
  );
});
