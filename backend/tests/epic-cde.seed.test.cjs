const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const seedPath = path.join(repoRoot, 'scripts', 'test-seed', 'epic-cde.seed.json');

function loadSeed() {
  assert.ok(fs.existsSync(seedPath), 'manifest de seed ausente em scripts/test-seed/epic-cde.seed.json');
  return JSON.parse(fs.readFileSync(seedPath, 'utf8'));
}

test('seed do epic cde expone usuarios e entidades minimas', () => {
  const seed = loadSeed();

  assert.equal(seed.name, 'epic-cde');
  assert.ok(Array.isArray(seed.users));
  assert.ok(Array.isArray(seed.notes));
  assert.ok(seed.users.some((user) => user.email === 'admin@juridico.com' && user.role === 'ADM'));
  assert.ok(seed.users.some((user) => user.email === 'advogado@juridico.com' && user.role === 'ADV'));
  assert.equal(seed.crm.opportunities[0].processNumber, '10024567820265020001');
  assert.equal(seed.publications.eligibleForDeadline[0].idempotencyKey, 'pub:551|process:3|create-deadline');
  assert.equal(seed.deadlines.focus[0].origin, 'publicacao');
});

