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

test('docs do epic ij publicam os artefatos obrigatorios', () => {
  const requiredFiles = ['overview.md', 'contracts.md', 'security-model.md', 'runbook.md', 'qa.md', 'changelog.md'];
  for (const fileName of requiredFiles) {
    assert.ok(fs.existsSync(path.join(docsRoot, fileName)), `arquivo obrigatorio ausente: ${fileName}`);
  }
});

test('contrato cobre a frente de tarefas e o smoke minimo', () => {
  const contract = readContract();
  const docs = readDoc('contracts.md');

  assert.ok(contract.commands['task.create']);
  assert.ok(contract.commands['task.updateStatus']);
  assert.ok(contract.commands['task.followup.schedule']);
  assert.match(contract.commands['task.create'].errors.join('\n'), /TASK_PERMISSION_DENIED/);
  assert.match(docs, /frontend\/epic-ij\.smoke\.test\.ts/);
  assert.match(docs, /GET \/tasks/);
  assert.match(docs, /POST \/tasks/);
  assert.match(docs, /PUT \/tasks\/:id/);
});
