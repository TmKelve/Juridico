const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const repositoryPath = path.resolve(__dirname, '..', '..', '..', 'dist', 'timesheet', 'core', 'time-entry.repository.js');
const servicePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'timesheet', 'reports', 'timesheet-report.service.js');

test('TimesheetReportService aggregates totals by period', async () => {
  const { InMemoryTimeEntryRepository } = require(repositoryPath);
  const { TimesheetReportService } = require(servicePath);

  const repository = new InMemoryTimeEntryRepository({
    entries: [
      {
        id: 'entry-1',
        userId: 7,
        teamId: null,
        portfolioId: null,
        clientId: null,
        processId: null,
        taskId: null,
        attendanceId: null,
        agendaEventId: null,
        activityType: 'analise',
        source: 'manual',
        status: 'approved',
        billable: true,
        durationMinutes: 60,
        billableMinutes: 60,
        startedAt: '2026-05-26T09:00:00.000Z',
        endedAt: '2026-05-26T10:00:00.000Z',
        notes: null,
        origin: 'manual',
        createdByUserId: 7,
        approvedByUserId: 1,
        approvedAt: '2026-05-26T10:05:00.000Z',
        lockedAt: null,
        correlationId: null,
        idempotencyKey: null,
        createdAt: '2026-05-26T10:00:00.000Z',
        updatedAt: '2026-05-26T10:05:00.000Z',
      },
    ],
  });

  const service = new TimesheetReportService(repository);
  const report = await service.query({ userId: 7, from: '2026-05-01', to: '2026-05-31' });

  assert.equal(report.summary.totalMinutes, 60);
  assert.equal(report.summary.billableMinutes, 60);
  assert.equal(report.summary.approvedMinutes, 60);
});
