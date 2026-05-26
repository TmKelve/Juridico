const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'bi', 'metrics', 'productivity-executive-metrics.service.js');

test('ProductivityExecutiveMetricsService aggregates operational productivity snapshots', async () => {
  const { ProductivityExecutiveMetricsService } = require(modulePath);

  const service = new ProductivityExecutiveMetricsService();
  const metrics = service.buildMetrics(
    {
      scopeType: 'team',
      scopeId: '7',
      from: '2026-05-01',
      to: '2026-05-31',
      groupBy: 'day',
      timezone: 'America/Sao_Paulo',
    },
    [
      { referenceDate: '2026-05-01', tasksCompleted: 3, tasksOverdue: 1, attendancesHandled: 2, avgResolutionHours: 6 },
      { referenceDate: '2026-05-02', tasksCompleted: 4, tasksOverdue: 0, attendancesHandled: 1, avgResolutionHours: 4 },
    ],
  );

  assert.equal(metrics[0].metricKey, 'productivity.tasks.completed');
  assert.equal(metrics[0].value, 7);
  assert.equal(metrics[3].value, 5);
});
