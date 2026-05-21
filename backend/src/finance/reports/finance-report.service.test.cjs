const test = require('node:test');
const assert = require('node:assert/strict');

test('FinanceCashflowReportService groups operational cashflow by period', async () => {
  const { FinanceCashflowReportService } = require('../../../dist/finance/reports/cashflow-report.service.js');

  const service = new FinanceCashflowReportService();
  const result = service.build({
    from: '2026-05-01',
    to: '2026-05-31',
    groupBy: 'week',
    entries: [
      {
        id: 1,
        type: 'receivable',
        status: 'open',
        amountCents: 12000,
        settledAmountCents: 0,
        dueDate: '2026-05-02',
        settlementDate: null,
      },
      {
        id: 2,
        type: 'receivable',
        status: 'paid',
        amountCents: 9000,
        settledAmountCents: 9000,
        dueDate: '2026-05-08',
        settlementDate: '2026-05-08',
      },
      {
        id: 3,
        type: 'payable',
        status: 'open',
        amountCents: 4000,
        settledAmountCents: 0,
        dueDate: '2026-05-09',
        settlementDate: null,
      },
      {
        id: 4,
        type: 'payable',
        status: 'paid',
        amountCents: 3000,
        settledAmountCents: 3000,
        dueDate: '2026-05-15',
        settlementDate: '2026-05-15',
      },
    ],
  });

  assert.equal(result.totals.inflowCents, 21000);
  assert.equal(result.totals.outflowCents, 7000);
  assert.equal(result.totals.netCents, 14000);
  assert.equal(result.series.length, 3);
  assert.deepEqual(result.series[1], {
    date: '2026-W19',
    inflowCents: 9000,
    outflowCents: 4000,
    netCents: 5000,
  });
});

test('FinanceAgingReportService exposes contract-shaped aging payload and indicators', async () => {
  const { FinanceAgingReportService } = require('../../../dist/finance/reports/aging-report.service.js');

  const service = new FinanceAgingReportService();
  const result = service.build({
    referenceDate: '2026-05-21',
    bucketMode: 'default_4',
    entries: [
      { id: 1, type: 'receivable', status: 'open', amountCents: 10000, settledAmountCents: 0, dueDate: '2026-05-11' },
      { id: 2, type: 'receivable', status: 'overdue', amountCents: 20000, settledAmountCents: 0, dueDate: '2026-04-06' },
      { id: 3, type: 'receivable', status: 'open', amountCents: 5000, settledAmountCents: 0, dueDate: '2026-05-25' },
    ],
  });

  assert.equal(result.referenceDate, '2026-05-21');
  assert.equal(result.summary.totalAmountCents, 30000);
  assert.equal(result.indicators.currentAmountCents, 5000);
  assert.equal(result.indicators.overdueAmountCents, 30000);
  assert.deepEqual(result.buckets.map((bucket) => bucket.label), ['0-30', '31-60', '61-90', '90+']);
});
