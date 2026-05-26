const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'mobile', 'adapters', 'mobile-feed.adapter.js');

test('MobileFeedAdapter merges tasks, deadlines, agenda and pending timesheet items', async () => {
  const { MobileFeedAdapter } = require(modulePath);

  const adapter = new MobileFeedAdapter();
  const result = adapter.build({
    tasks: [{ id: 1, title: 'Protocolar manifestação', status: 'pendente', priority: 'alta', dueDate: '2026-05-27' }],
    deadlines: [{ id: 2, title: 'Prazo recursal', status: 'atrasado', dueDate: '2026-05-26' }],
    agendaEvents: [{
      id: 3,
      title: 'Audiência',
      eventType: 'audiencia',
      status: 'confirmado',
      priority: 'alta',
      startAt: new Date('2026-05-26T13:00:00.000Z'),
      endAt: new Date('2026-05-26T14:00:00.000Z'),
      processId: null,
      process: null,
      clientId: null,
      clientRecord: null,
      attendanceId: null,
      attendance: null,
      taskId: null,
      task: null,
      responsible: 'advogado',
      locationOrChannel: 'Forum',
      notes: '',
      origin: 'manual',
      createdBy: 'advogado',
    }],
    pendingTimesheet: [{ id: 'entry-1', startedAt: '2026-05-26T09:00:00.000Z', status: 'draft', durationMinutes: 60 }],
  });

  assert.equal(result.items.length, 4);
  assert.ok(result.items.some((item) => item.type === 'timesheet_pending'));
});
