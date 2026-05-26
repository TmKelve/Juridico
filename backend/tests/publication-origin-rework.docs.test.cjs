const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const docsRoot = path.join(repoRoot, 'docs', 'publication-origin-rework');

function readDoc(fileName) {
  const filePath = path.join(docsRoot, fileName);
  assert.ok(fs.existsSync(filePath), `${fileName} ausente em docs/publication-origin-rework`);
  return fs.readFileSync(filePath, 'utf8');
}

test('docs/publication-origin-rework publica os artefatos obrigatorios', () => {
  const requiredFiles = ['README.md', 'overview.md', 'contracts.md', 'qa.md', 'runbook.md', 'changelog.md'];
  for (const fileName of requiredFiles) {
    assert.ok(fs.existsSync(path.join(docsRoot, fileName)), `arquivo obrigatorio ausente: ${fileName}`);
  }
});

test('contracts.md cobre endpoints novos, compatibilidade e smoke', () => {
  const contracts = readDoc('contracts.md');

  for (const fragment of [
    'GET /publication-captures',
    'GET /publication-captures/:id/evidence',
    'GET /publication-pipeline/:correlationId',
    'GET /publication-pipeline/:correlationId/actions',
    'GET /publications',
    'GET /triage',
    'GET /crm/leads',
    'GET /crm/opportunities',
    'frontend/publication-origin-rework.smoke.test.ts',
  ]) {
    assert.match(contracts, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
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
