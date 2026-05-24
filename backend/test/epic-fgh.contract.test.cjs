const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const contractPath = path.join(__dirname, '..', '..', 'contracts', 'epic-fgh.contract.json');

test('epic fgh contract defines all mandatory commands', () => {
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  const commands = contract.commands ?? {};
  const required = [
    'triage.item.create',
    'triage.item.prioritize',
    'triage.item.decide',
    'triage.item.explain',
    'triage.item.triggerAutomation',
    'document.upload',
    'document.version.create',
    'document.checklist.bind',
    'document.approval.update',
    'document.link.bindEntities',
    'document.artifact.generate',
    'client.portal.fetch',
    'client.communication.send',
    'client.communication.history',
    'client.consent.update',
    'client.prospect.signal',
    'audit.event',
  ];

  for (const command of required) {
    assert.ok(commands[command], `missing command ${command}`);
    assert.ok(commands[command].input, `${command} missing input`);
    assert.ok(commands[command].output, `${command} missing output`);
    assert.ok(commands[command].errors, `${command} missing errors`);
    assert.ok(commands[command].idempotency, `${command} missing idempotency`);
  }
});
