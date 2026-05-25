const test = require('node:test');
const assert = require('node:assert/strict');

test('TeamOwnershipService assigns portfolio ownership, emits audit event and replays same idempotency key', async () => {
  const {
    InMemoryManagementAuditRepository,
    ManagementAuditService,
  } = require('../../dist/audit/team/index.js');
  const {
    InMemoryTeamOwnershipRepository,
    TeamOwnershipService,
  } = require('../../dist/team/index.js');

  const repository = new InMemoryTeamOwnershipRepository({
    teams: [{ id: 7, name: 'Equipe Civel', memberUserIds: [8, 9, 10], active: true }],
    users: [{ id: 8 }, { id: 9 }, { id: 10 }, { id: 11 }],
    portfolios: [{
      portfolioId: 41,
      name: 'Carteira Empresa X',
      teamId: 7,
      primaryOwnerUserId: 9,
      backupOwnerUserId: null,
      memberUserIds: [9, 10],
      active: true,
    }],
  });
  const auditService = new ManagementAuditService(new InMemoryManagementAuditRepository());
  const service = new TeamOwnershipService({ repository, auditService });

  const first = await service.assignOwnership({
    portfolioId: 41,
    primaryOwnerUserId: 8,
    backupOwnerUserId: 10,
    teamId: 7,
    memberUserIds: [8, 10],
    actorUserId: 11,
    idempotencyKey: 'assign-41-v1',
  });

  const replay = await service.assignOwnership({
    portfolioId: 41,
    primaryOwnerUserId: 8,
    backupOwnerUserId: 10,
    teamId: 7,
    memberUserIds: [8, 10],
    actorUserId: 11,
    idempotencyKey: 'assign-41-v1',
  });

  assert.equal(first.portfolio.primaryOwnerUserId, 8);
  assert.equal(first.portfolio.backupOwnerUserId, 10);
  assert.deepEqual(first.portfolio.memberUserIds, [8, 10]);
  assert.equal(first.auditEvent.scope, 'team');
  assert.equal(first.auditEvent.action, 'team.assignOwnership');
  assert.equal(first.idempotency, 'created');
  assert.equal(replay.idempotency, 'replayed');
  assert.equal(replay.portfolio.primaryOwnerUserId, 8);
});
