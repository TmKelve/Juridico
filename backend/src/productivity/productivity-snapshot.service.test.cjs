const test = require('node:test');
const assert = require('node:assert/strict');

test('ProductivitySnapshotService builds team productivity snapshot and emits a productivity audit event', async () => {
  const {
    InMemoryManagementAuditRepository,
    ManagementAuditService,
  } = require('../../dist/audit/team/index.js');
  const {
    InMemoryProductivitySnapshotRepository,
    ProductivitySnapshotService,
  } = require('../../dist/productivity/index.js');

  const repository = new InMemoryProductivitySnapshotRepository({
    tasks: [
      {
        taskId: 201,
        status: 'concluida',
        ownerUserId: 8,
        portfolioId: 41,
        teamId: 7,
        dueDate: '2026-05-22',
        completedAt: '2026-05-24T10:00:00.000Z',
        createdAt: '2026-05-20T08:00:00.000Z',
        updatedAt: '2026-05-24T10:00:00.000Z',
      },
      {
        taskId: 202,
        status: 'em_execucao',
        ownerUserId: 10,
        portfolioId: 41,
        teamId: 7,
        dueDate: '2026-05-23',
        completedAt: null,
        createdAt: '2026-05-21T08:00:00.000Z',
        updatedAt: '2026-05-24T11:00:00.000Z',
      },
    ],
    attendances: [
      {
        attendanceId: 301,
        status: 'resolvido',
        ownerUserId: 8,
        portfolioId: 41,
        teamId: 7,
        slaTargetAt: '2026-05-24T09:00:00.000Z',
        resolvedAt: '2026-05-24T08:30:00.000Z',
        createdAt: '2026-05-24T07:00:00.000Z',
        updatedAt: '2026-05-24T08:30:00.000Z',
      },
      {
        attendanceId: 302,
        status: 'fechado_fora_sla',
        ownerUserId: 10,
        portfolioId: 41,
        teamId: 7,
        slaTargetAt: '2026-05-24T09:00:00.000Z',
        resolvedAt: '2026-05-24T11:00:00.000Z',
        createdAt: '2026-05-24T06:00:00.000Z',
        updatedAt: '2026-05-24T11:00:00.000Z',
      },
    ],
    reassignmentEvents: [
      { scope: 'portfolio', action: 'team.reassignPortfolio', entityId: '41', occurredAt: '2026-05-24T09:00:00.000Z' },
    ],
  });
  const auditService = new ManagementAuditService(new InMemoryManagementAuditRepository());
  const service = new ProductivitySnapshotService({ repository, auditService });

  const result = await service.snapshot({
    referenceDate: '2026-05-24',
    scopeType: 'team',
    scopeId: 7,
    includeClosedTasks: true,
    includeAttendances: true,
    actorUserId: 21,
    idempotencyKey: null,
  });

  assert.equal(result.snapshot.scopeType, 'team');
  assert.equal(result.snapshot.scopeId, 7);
  assert.equal(result.snapshot.tasksCompleted, 1);
  assert.equal(result.snapshot.tasksOverdue, 1);
  assert.equal(result.snapshot.attendancesHandled, 2);
  assert.equal(result.snapshot.slaBreaches, 1);
  assert.equal(result.snapshot.reassignments, 1);
  assert.equal(result.auditEvent.scope, 'productivity');
});
