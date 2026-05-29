const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const policyPath = path.resolve(__dirname, '..', '..', 'dist', 'platform-access', 'company-status-access-policy.js');

test('company status policy blocks write for read_only and allows read', async () => {
  const { evaluateCompanyStatusAccess } = require(policyPath);
  const writeDecision = evaluateCompanyStatusAccess({ status: 'read_only', operation: 'write' });
  const readDecision = evaluateCompanyStatusAccess({ status: 'read_only', operation: 'read' });

  assert.equal(writeDecision.allowed, false);
  assert.equal(writeDecision.reason, 'STATUS_BLOCKED_READ_ONLY_WRITE');
  assert.equal(readDecision.allowed, true);
});

test('company status policy blocks suspended and cancelled tenant operations', async () => {
  const { evaluateCompanyStatusAccess } = require(policyPath);
  const suspended = evaluateCompanyStatusAccess({ status: 'suspended', operation: 'read' });
  const cancelled = evaluateCompanyStatusAccess({ status: 'cancelled', operation: 'write' });

  assert.equal(suspended.allowed, false);
  assert.equal(suspended.reason, 'STATUS_BLOCKED_SUSPENDED');
  assert.equal(cancelled.allowed, false);
  assert.equal(cancelled.reason, 'STATUS_BLOCKED_CANCELLED');
});

test('company status policy treats past_due as read-only and grace_period as allowed', async () => {
  const { evaluateCompanyStatusAccess } = require(policyPath);
  const pastDueWrite = evaluateCompanyStatusAccess({ status: 'past_due', operation: 'write' });
  const pastDueRead = evaluateCompanyStatusAccess({ status: 'past_due', operation: 'read' });
  const graceWrite = evaluateCompanyStatusAccess({ status: 'grace_period', operation: 'write' });

  assert.equal(pastDueWrite.allowed, false);
  assert.equal(pastDueRead.allowed, true);
  assert.equal(graceWrite.allowed, true);
});
