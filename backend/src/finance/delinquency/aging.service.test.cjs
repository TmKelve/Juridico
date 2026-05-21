const test = require('node:test');
const assert = require('node:assert/strict');

test('buildAgingSnapshot groups overdue receivables into default 4 buckets and computes delinquency indicators', async () => {
  const { buildAgingSnapshot, buildDelinquencyIndicators } = require('../../../dist/finance/delinquency/aging.service.js');

  const entries = [
    { id: 1, type: 'receivable', status: 'open', amountCents: 10000, settledAmountCents: 0, dueDate: '2026-05-11' },
    { id: 2, type: 'receivable', status: 'overdue', amountCents: 20000, settledAmountCents: 0, dueDate: '2026-04-06' },
    { id: 3, type: 'receivable', status: 'partially_paid', amountCents: 15000, settledAmountCents: 5000, dueDate: '2026-03-07' },
    { id: 4, type: 'receivable', status: 'open', amountCents: 8000, settledAmountCents: 0, dueDate: '2026-01-01' },
    { id: 5, type: 'receivable', status: 'paid', amountCents: 7000, settledAmountCents: 7000, dueDate: '2026-05-01' },
    { id: 6, type: 'payable', status: 'open', amountCents: 5000, settledAmountCents: 0, dueDate: '2026-05-01' },
  ];

  const snapshot = buildAgingSnapshot(entries, '2026-05-21');
  const indicators = buildDelinquencyIndicators(entries, '2026-05-21');

  assert.deepEqual(
    snapshot.buckets.map((bucket) => ({ label: bucket.label, count: bucket.count, amountCents: bucket.amountCents })),
    [
      { label: '0-30', count: 1, amountCents: 10000 },
      { label: '31-60', count: 1, amountCents: 20000 },
      { label: '61-90', count: 1, amountCents: 10000 },
      { label: '90+', count: 1, amountCents: 8000 },
    ],
  );
  assert.equal(snapshot.summary.totalAmountCents, 48000);
  assert.equal(snapshot.summary.totalCount, 4);
  assert.equal(indicators.totalReceivablesCents, 53000);
  assert.equal(indicators.overdueAmountCents, 48000);
  assert.equal(indicators.overdueCount, 4);
  assert.equal(indicators.oldestDaysPastDue, 140);
  assert.equal(indicators.overdueRatePercent, 90.57);
});
