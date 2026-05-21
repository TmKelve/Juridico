const test = require('node:test');
const assert = require('node:assert/strict');

test('computeNextFinanceCollectionsSchedule rounds up to the next half-hour slot', async () => {
  const { computeNextFinanceCollectionsSchedule } = require('../../../dist/shared/scheduler/finance-collections-schedule.js');

  const nextRun = computeNextFinanceCollectionsSchedule(new Date('2026-05-21T08:07:00.000Z'));

  assert.equal(nextRun.toISOString(), '2026-05-21T08:30:00.000Z');
});

test('registerFinanceSchedulers exposes an isolated collections scheduler registry', async () => {
  const { registerFinanceSchedulers } = require('../../../dist/shared/scheduler/finance-scheduler-registry.js');

  const registry = registerFinanceSchedulers({
    disabled: true,
    collections: {
      onTick: async () => {},
    },
  });

  const plans = registry.armAll(new Date('2026-05-21T08:00:00.000Z'));

  assert.equal(plans.collections.enabled, false);
  assert.equal(typeof registry.stopAll, 'function');
});
