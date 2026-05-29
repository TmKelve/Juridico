const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const contractPath = path.resolve(__dirname, '..', '..', 'contracts', 'foundation-multitenant.contract.json');
const docsContractsPath = path.resolve(__dirname, '..', '..', 'docs', 'fase-1-foundation', 'contracts.md');
const docsAuthPath = path.resolve(__dirname, '..', '..', 'docs', 'fase-1-foundation', 'auth-and-session.md');
const docsQaPath = path.resolve(__dirname, '..', '..', 'docs', 'fase-1-foundation', 'qa.md');
const authzCheckPath = path.resolve(__dirname, '..', 'dist', 'authz', 'policies', 'authz.check.js');

test('foundation contract cobre comandos minimos de auth/session/authz/company-scope', () => {
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  const commands = contract.commands ?? {};

  assert.ok(commands['auth.login']);
  assert.ok(commands['session.resolveCompanyContext']);
  assert.ok(commands['auth.access.evaluate']);
  assert.ok(commands['resource.companyScope.validate']);
});

test('authz sensivel nega por padrao quando papel nao tem grant', async () => {
  const { checkAuthorization } = require(authzCheckPath);

  const denied = checkAuthorization({
    actor: { userId: 9, role: 'ADV' },
    permissionKey: 'ai.audit.view',
    resourceType: 'ai',
    context: {
      ownerUserId: 9,
      allowedScopes: ['own'],
      accessContext: 'tenant',
    },
  });

  assert.equal(denied.allowed, false);
  assert.equal(denied.reason, 'AUTHZ_SENSITIVE_DENY_BY_DEFAULT');
  assert.equal(denied.sensitive, true);
});

test('docs da fase 1 refletem contrato, auth/session e cenarios de isolamento', () => {
  const contractsDoc = fs.readFileSync(docsContractsPath, 'utf8');
  const authDoc = fs.readFileSync(docsAuthPath, 'utf8');
  const qaDoc = fs.readFileSync(docsQaPath, 'utf8');

  assert.match(contractsDoc, /foundation-multitenant\.contract\.json/);
  assert.match(contractsDoc, /auth\.access\.evaluate/);
  assert.match(authDoc, /Claims obrigatorias/i);
  assert.match(authDoc, /companyId/);
  assert.match(qaDoc, /acesso negado entre empresas diferentes/i);
  assert.match(qaDoc, /separacao de enforcement plataforma vs tenant/i);
});
