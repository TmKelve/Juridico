const test = require('node:test');
const assert = require('node:assert/strict');

test('ManagementAuditService records normalized management audit events and replays idempotent requests', async () => {
  const {
    InMemoryManagementAuditRepository,
    ManagementAuditService,
  } = require('../../../dist/audit/team/index.js');

  const service = new ManagementAuditService(new InMemoryManagementAuditRepository());

  const event = await service.record({
    scope: 'team',
    action: 'team.assignOwnership',
    status: 'success',
    entityType: 'portfolio',
    entityId: 41,
    actor: 'user:9',
    occurredAt: '2026-05-25T13:00:00.000Z',
    context: { portfolioId: 41, teamId: 7 },
    diff: { before: { primaryOwnerUserId: 3 }, after: { primaryOwnerUserId: 8 } },
    idempotencyKey: 'audit-41',
    correlationId: 'corr-41',
  });

  assert.equal(event.scope, 'team');
  assert.equal(event.entityId, '41');
  assert.equal(event.actor, 'user:9');
  assert.equal(event.idempotencyKey, 'audit-41');

  const first = await service.runIdempotent({
    key: 'audit-event-1',
    scope: 'audit.event',
    entityType: 'portfolio',
    entityId: 41,
    action: 'audit.event',
    payload: { scope: 'portfolio', entityId: 41, marker: 'same-payload' },
    execute: async () => ({ ok: true, emittedEventId: event.id }),
  });

  const replay = await service.runIdempotent({
    key: 'audit-event-1',
    scope: 'audit.event',
    entityType: 'portfolio',
    entityId: 41,
    action: 'audit.event',
    payload: { scope: 'portfolio', entityId: 41, marker: 'same-payload' },
    execute: async () => ({ ok: false }),
  });

  assert.equal(first.mode, 'created');
  assert.equal(replay.mode, 'replayed');
  assert.deepEqual(replay.data, first.data);
});
