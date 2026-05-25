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

test('contrato documenta atendimentos, conversao e gap atual do cliente', () => {
  const contract = readContract();
  const overview = readDoc('overview.md');
  const runbook = readDoc('runbook.md');

  assert.ok(contract.commands['attendance.create']);
  assert.ok(contract.commands['attendance.convertToTask']);
  assert.ok(contract.commands['attendance.convertToDeadline']);
  assert.match(JSON.stringify(contract.entities.attendanceAggregate.fields), /conversionState/);
  assert.match(overview, /Criar tarefa/);
  assert.match(overview, /nao consome uma mutacao dedicada de conversao auditavel/);
  assert.match(runbook, /Abrir `\/atendimentos`, registrar um novo atendimento e acionar "Criar tarefa" no detalhe\./);
});
