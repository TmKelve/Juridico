const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const repositoryPath = path.resolve(__dirname, '..', '..', '..', 'dist', 'timesheet', 'core', 'time-entry.repository.js');
const servicePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'timesheet', 'approval', 'time-entry-approval.service.js');

test('TimeEntryApprovalService approves and locks entries', async () => {
  const { InMemoryTimeEntryRepository } = require(repositoryPath);
  const { TimeEntryApprovalService } = require(servicePath);

  const repository = new InMemoryTimeEntryRepository({
    entries: [{
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
      status: 'submitted',
      billable: true,
      durationMinutes: 60,
      billableMinutes: 60,
      startedAt: '2026-05-26T09:00:00.000Z',
      endedAt: '2026-05-26T10:00:00.000Z',
      notes: null,
      origin: 'manual',
      createdByUserId: 7,
      approvedByUserId: null,
      approvedAt: null,
      lockedAt: null,
      correlationId: null,
      idempotencyKey: null,
      createdAt: '2026-05-26T10:00:00.000Z',
      updatedAt: '2026-05-26T10:00:00.000Z',
    }],
  });
  const service = new TimeEntryApprovalService(repository);

  const approved = await service.approve({ entryIds: ['entry-1'], decision: 'approved', approverUserId: 1 });
  assert.equal(approved.entries[0].status, 'approved');

  const closed = await service.approve({ entryIds: ['entry-1'], decision: 'closed', approverUserId: 1 });
  assert.equal(closed.entries[0].status, 'locked');
});
