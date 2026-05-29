const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const transitionsPath = path.resolve(__dirname, '..', 'dist', 'subscription', 'subscription.transitions.js');
const syncPath = path.resolve(__dirname, '..', 'dist', 'company-status', 'company-status.sync.js');

test('subscription transition matrix blocks invalid transitions', async () => {
  const { isValidSubscriptionTransition } = require(transitionsPath);
  assert.equal(isValidSubscriptionTransition('draft', 'active'), false);
  assert.equal(isValidSubscriptionTransition('active', 'read_only'), true);
});

test('subscription status maps to company status', async () => {
  const { deriveCompanyStatusFromSubscriptionStatus } = require(syncPath);
  assert.equal(deriveCompanyStatusFromSubscriptionStatus('past_due'), 'grace_period');
  assert.equal(deriveCompanyStatusFromSubscriptionStatus('cancelled'), 'cancelled');
});
