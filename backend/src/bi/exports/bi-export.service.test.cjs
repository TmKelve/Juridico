const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'bi', 'exports', 'bi-export.service.js');

test('BiExportService generates export artifact metadata', async () => {
  const { BiExportService } = require(modulePath);

  const service = new BiExportService();
  const result = await service.generate({
    dashboardKey: 'financial_consolidated',
    format: 'csv',
    requestedBy: 'user:3',
  });

  assert.equal(result.dashboardKey, 'financial_consolidated');
  assert.equal(result.format, 'csv');
  assert.match(result.artifactPath, /financial_consolidated/);
});
