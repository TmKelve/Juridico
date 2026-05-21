const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const docsRoot = path.join(repoRoot, 'docs', 'epic-cde');

function readDoc(fileName) {
  const filePath = path.join(docsRoot, fileName);
  assert.ok(fs.existsSync(filePath), `${fileName} ausente em docs/epic-cde`);
  return fs.readFileSync(filePath, 'utf8');
}

test('docs/epic-cde publica os artefatos obrigatorios', () => {
  const requiredFiles = ['README.md', 'overview.md', 'contracts.md', 'qa.md', 'runbook.md', 'changelog.md'];
  for (const fileName of requiredFiles) {
    assert.ok(fs.existsSync(path.join(docsRoot, fileName)), `arquivo obrigatorio ausente: ${fileName}`);
  }
});

test('contracts.md cobre CRM, prazo, idempotencia e smoke', () => {
  const contracts = readDoc('contracts.md');

  assert.match(contracts, /CRM_CONVERSION_CONFIRMATION_REQUIRED/);
  assert.match(contracts, /CRM_PROCESS_NUMBER_ALREADY_EXISTS/);
  assert.match(contracts, /deadline_created_from_publication/);
  assert.match(contracts, /deadline_completed/);
  assert.match(contracts, /frontend\/adv\.screens\.smoke\.test\.ts/);
  assert.match(contracts, /frontend\/admin\.users\.smoke\.test\.ts/);
});

test('qa.md tem as secoes minimas de sign-off', () => {
  const qa = readDoc('qa.md');

  for (const heading of [
    '## Escopo validado',
    '## Riscos principais',
    '## Testes recomendados ou executados',
    '## Lacunas de cobertura',
    '## Evidencias minimas para sign-off',
    '## Parecer de QA',
  ]) {
    assert.match(qa, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
