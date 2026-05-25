const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const docsRoot = path.join(repoRoot, 'docs', 'epic-ij');
const contractPath = path.join(repoRoot, 'contracts', 'epic-ij.contract.json');

function readDoc(fileName) {
  const filePath = path.join(docsRoot, fileName);
  assert.ok(fs.existsSync(filePath), `${fileName} ausente em docs/epic-ij`);
  return fs.readFileSync(filePath, 'utf8');
}

function readContract() {
  assert.ok(fs.existsSync(contractPath), 'contracts/epic-ij.contract.json ausente');
  return JSON.parse(fs.readFileSync(contractPath, 'utf8'));
}

test('modelo de seguranca explicita deny-by-default e escopos de authz', () => {
  const contract = readContract();
  const security = readDoc('security-model.md');
  const qa = readDoc('qa.md');

  assert.ok(contract.entities.authzDecision);
  assert.match(JSON.stringify(contract.entities.authzDecision.fields), /own\|team\|portfolio\|global\|denied/);
  assert.match(security, /Deny-by-default/);
  assert.match(security, /`own`, `team`, `portfolio`, `global` ou `denied`/);
  assert.match(security, /A rota `\/usuarios` so deve abrir para `ADM`/);
  assert.match(qa, /Bloqueio de acao sem permissao/);
});
