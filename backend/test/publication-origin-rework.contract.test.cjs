const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const contractPath = path.join(repoRoot, 'contracts', 'publication-origin-rework.contract.json');
const docsRoot = path.join(repoRoot, 'docs', 'publication-origin-rework');

function readContract() {
  assert.ok(fs.existsSync(contractPath), 'contracts/publication-origin-rework.contract.json ausente');
  return JSON.parse(fs.readFileSync(contractPath, 'utf8'));
}

function readDoc(fileName) {
  const filePath = path.join(docsRoot, fileName);
  assert.ok(fs.existsSync(filePath), `${fileName} ausente em docs/publication-origin-rework`);
  return fs.readFileSync(filePath, 'utf8');
}

test('contrato soberano expõe entidades, ordem de integração e endpoints do rework', () => {
  const contract = readContract();

  assert.equal(contract.epic, 'Publication Origin Rework');
  assert.deepEqual(contract.integrationOrder, [
    'contracts',
    'backend-origin-correlation',
    'backend-derived-actions-and-api',
    'frontend-crm-publications-triage',
    'tests',
    'docs',
  ]);

  for (const entityName of [
    'captureRecord',
    'captureEvidenceFetch',
    'publicationNormalizedRecord',
    'publicationConsolidationStatus',
    'publicationPipelineTimeline',
    'crmOriginReference',
    'triageOriginReference',
    'derivedActionRecord',
  ]) {
    assert.ok(contract.entities[entityName], `entidade obrigatoria ausente: ${entityName}`);
  }

  assert.deepEqual(contract.newEndpoints, [
    'GET /publication-captures',
    'GET /publication-captures/:id',
    'GET /publication-captures/:id/evidence',
    'GET /publication-pipeline/:correlationId',
    'GET /publication-pipeline/:correlationId/actions',
    'POST /publication-origin/backfill',
  ]);
});

test('documentacao referencia compatibilidade aditiva e lacunas do orquestrador', () => {
  const overview = readDoc('overview.md');
  const contracts = readDoc('contracts.md');
  const runbook = readDoc('runbook.md');

  assert.match(overview, /GET \/publications/);
  assert.match(overview, /GET \/triage/);
  assert.match(overview, /GET \/crm\/leads/);
  assert.match(overview, /GET \/crm\/opportunities/);
  assert.match(overview, /depende da integração do backend principal/i);
  assert.match(contracts, /timelineUrl/);
  assert.match(contracts, /evidenceUrl/);
  assert.match(runbook, /correlationId/);
  assert.match(runbook, /POST \/publication-origin\/backfill/);
  assert.match(runbook, /dependência do orquestrador\/backend principal/i);
});
