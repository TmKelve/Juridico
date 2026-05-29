const test = require('node:test');
const assert = require('node:assert/strict');

const modulePath = require('node:path').resolve(
  __dirname,
  '..',
  '..',
  '..',
  'dist',
  'shared',
  'request-context',
  'company-request-context.js',
);

test('resolveCompanyRequestContext uses claim when membership validates same company', async () => {
  const { resolveCompanyRequestContext } = require(modulePath);
  const context = await resolveCompanyRequestContext({
    claims: { sub: 11, role: 'ADM', email: 'adm@juridico.local', companyId: 'cmp-1' },
    membershipPort: {
      async listActiveCompanyIdsByUser() {
        return ['cmp-1', 'cmp-2'];
      },
    },
  });

  assert.equal(context.companyId, 'cmp-1');
  assert.equal(context.source, 'claim');
});

test('resolveCompanyRequestContext falls back to singleton membership when claim is absent', async () => {
  const { resolveCompanyRequestContext } = require(modulePath);
  const context = await resolveCompanyRequestContext({
    claims: { sub: 22, role: 'ADV', email: 'adv@juridico.local' },
    membershipPort: {
      async listActiveCompanyIdsByUser() {
        return ['cmp-9'];
      },
    },
  });

  assert.equal(context.companyId, 'cmp-9');
  assert.equal(context.source, 'membership-singleton');
});

test('resolveCompanyRequestContext blocks cross-tenant claim', async () => {
  const { resolveCompanyRequestContext, CompanyRequestContextError } = require(modulePath);

  await assert.rejects(
    () =>
      resolveCompanyRequestContext({
        claims: { sub: 33, role: 'FIN', email: 'fin@juridico.local', companyId: 'cmp-x' },
        membershipPort: {
          async listActiveCompanyIdsByUser() {
            return ['cmp-y'];
          },
        },
      }),
    (error) => error instanceof CompanyRequestContextError && error.code === 'CROSS_TENANT_FORBIDDEN',
  );
});

