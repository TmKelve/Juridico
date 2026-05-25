const test = require('node:test');
const assert = require('node:assert/strict');

test('PortfolioReassignmentService reassigns portfolio owner, cascades open work and writes audit diff', async () => {
  const {
    InMemoryManagementAuditRepository,
    ManagementAuditService,
  } = require('../../dist/audit/team/index.js');
  const {
    InMemoryPortfolioOwnershipRepository,
    PortfolioReassignmentService,
  } = require('../../dist/ownership/index.js');

  const repository = new InMemoryPortfolioOwnershipRepository({
    users: [{ id: 12 }, { id: 18 }, { id: 77 }],
    portfolios: [{
      portfolioId: 88,
      name: 'Carteira Contencioso',
      teamId: 5,
      primaryOwnerUserId: 12,
      backupOwnerUserId: null,
      memberUserIds: [12, 18],
      active: true,
    }],
    tasks: [
      { taskId: 101, status: 'backlog', ownerUserId: 12, portfolioId: 88, teamId: 5, updatedAt: '2026-05-20T10:00:00.000Z' },
      { taskId: 102, status: 'em_execucao', ownerUserId: 12, portfolioId: 88, teamId: 5, updatedAt: '2026-05-20T11:00:00.000Z' },
      { taskId: 103, status: 'concluida', ownerUserId: 12, portfolioId: 88, teamId: 5, updatedAt: '2026-05-20T12:00:00.000Z' },
    ],
    attendances: [
      { attendanceId: 501, status: 'aberto', ownerUserId: 12, portfolioId: 88, teamId: 5, updatedAt: '2026-05-20T10:00:00.000Z' },
      { attendanceId: 502, status: 'resolvido', ownerUserId: 12, portfolioId: 88, teamId: 5, updatedAt: '2026-05-20T11:00:00.000Z' },
    ],
  });
  const auditService = new ManagementAuditService(new InMemoryManagementAuditRepository());
  const service = new PortfolioReassignmentService({ repository, auditService });

  const result = await service.reassignPortfolio({
    portfolioId: 88,
    fromOwnerUserId: 12,
    toOwnerUserId: 18,
    reason: 'redistribuicao de carteira',
    includeBacklog: true,
    includeOpenTasks: true,
    actorUserId: 77,
    idempotencyKey: 'reassign-88-v1',
  });

  assert.equal(result.portfolio.primaryOwnerUserId, 18);
  assert.equal(result.movedTasks, 2);
  assert.equal(result.movedAttendances, 1);
  assert.equal(result.auditEvent.scope, 'portfolio');
  assert.equal(result.auditEvent.action, 'team.reassignPortfolio');
  assert.equal(result.auditEvent.diff.after.primaryOwnerUserId, 18);
});
