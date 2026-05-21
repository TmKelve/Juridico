const test = require('node:test');
const assert = require('node:assert/strict');

test('computeNextPublicationSchedule returns the next slot on the same day', async () => {
  const { computeNextPublicationSchedule } = require('../../../dist/shared/scheduler/publication-schedule.js');

  const nextRun = computeNextPublicationSchedule(new Date(2026, 4, 20, 8, 30, 0, 0));

  assert.equal(nextRun.getFullYear(), 2026);
  assert.equal(nextRun.getMonth(), 4);
  assert.equal(nextRun.getDate(), 20);
  assert.equal(nextRun.getHours(), 12);
  assert.equal(nextRun.getMinutes(), 0);
});

test('createPublicationSchedulerPlan respects disabled mode and minimum delay', async () => {
  const { createPublicationSchedulerPlan } = require('../../../dist/shared/scheduler/publication-schedule.js');

  const disabledPlan = createPublicationSchedulerPlan({
    disabled: true,
    now: new Date(2026, 4, 20, 5, 0, 0, 0),
  });
  const enabledPlan = createPublicationSchedulerPlan({
    disabled: false,
    now: new Date(2026, 4, 20, 5, 59, 50, 0),
  });

  assert.equal(disabledPlan.enabled, false);
  assert.equal(disabledPlan.firstRunAt, null);
  assert.equal(disabledPlan.initialDelayMs, null);
  assert.equal(enabledPlan.enabled, true);
  assert.equal(enabledPlan.firstRunAt?.getHours(), 6);
  assert.equal(enabledPlan.firstRunAt?.getMinutes(), 0);
  assert.equal(enabledPlan.initialDelayMs, 60000);
});
