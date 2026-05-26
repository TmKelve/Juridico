const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'bi', 'metrics', 'finance-executive-metrics.service.js');

test('FinanceExecutiveMetricsService aggregates financial executive series', async () => {
  const { FinanceExecutiveMetricsService } = require(modulePath);

  const service = new FinanceExecutiveMetricsService();
  const metrics = service.buildMetrics(
    {
      scopeType: 'global',
      scopeId: 'global',
      from: '2026-05-01',
      to: '2026-05-31',
      groupBy: 'day',
      timezone: 'America/Sao_Paulo',
    },
    [
      { referenceDate: '2026-05-01', receivablesOpenCents: 1000, receivablesOverdueCents: 200, payablesOpenCents: 400, cashflowNetCents: 600 },
      { referenceDate: '2026-05-02', receivablesOpenCents: 500, receivablesOverdueCents: 100, payablesOpenCents: 300, cashflowNetCents: 200 },
    ],
  );

  assert.equal(metrics[0].value, 1500);
  assert.equal(metrics[1].value, 300);
  assert.equal(metrics[3].value, 800);
});
