const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const repositoryPath = path.resolve(__dirname, '..', '..', '..', 'dist', 'timesheet', 'core', 'time-entry.repository.js');
const servicePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'timesheet', 'core', 'time-entry.service.js');

test('TimeEntryService creates time entry and detects overlap conflict on second entry', async () => {
  const { InMemoryTimeEntryRepository } = require(repositoryPath);
  const { TimeEntryService } = require(servicePath);

  const repository = new InMemoryTimeEntryRepository();
  const service = new TimeEntryService(repository);

  const first = await service.create({
    userId: 7,
    activityType: 'analise',
    source: 'manual',
    startedAt: '2026-05-26T09:00:00.000Z',
    endedAt: '2026-05-26T10:00:00.000Z',
    billable: true,
    billableMinutes: 60,
  });

  assert.equal(first.entry.durationMinutes, 60);

  await assert.rejects(
    () => service.create({
      userId: 7,
      activityType: 'peticao',
      source: 'manual',
      startedAt: '2026-05-26T09:30:00.000Z',
      endedAt: '2026-05-26T10:30:00.000Z',
      billable: true,
      billableMinutes: 60,
    }),
    (error) => {
      assert.equal(error.code, 'TIMESHEET_CONFLICT');
      return true;
    },
  );
});
