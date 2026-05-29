const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const modulePath = path.resolve(__dirname, '..', 'dist', 'platform', 'audit', 'index.js');

test('platform-audit unit: record and list audit.event with companyId/actor/action/date range filters', async () => {
  const { InMemoryPlatformAuditRepository, PlatformAuditService, platformAuditList } = require(modulePath);
  const service = new PlatformAuditService(new InMemoryPlatformAuditRepository());

  await service.record({
    id: 'evt-1',
    companyId: 10,
    actor: 'user:7',
    action: 'platform.adminLogin.success',
    status: 'success',
    occurredAt: '2026-05-27T10:00:00.000Z',
    context: { ip: '127.0.0.1' },
  });
  await service.record({
    id: 'evt-2',
    companyId: 10,
    actor: 'user:8',
    action: 'platform.adminLogin.denied',
    status: 'warning',
    occurredAt: '2026-05-27T12:00:00.000Z',
    context: { ip: '127.0.0.2' },
  });
  await service.record({
    id: 'evt-3',
    companyId: 20,
    actor: 'user:7',
    action: 'platform.support.view',
    status: 'success',
    occurredAt: '2026-05-27T13:00:00.000Z',
    context: { section: 'overview' },
  });

  const byCompany = await platformAuditList(service, { companyId: 10 });
  assert.equal(byCompany.scope, 'platform.audit.list');
  assert.equal(byCompany.items.length, 2);

  const byActorAndAction = await platformAuditList(service, {
    companyId: 10,
    actor: 'user:8',
    action: 'platform.adminLogin.denied',
  });
  assert.equal(byActorAndAction.items.length, 1);
  assert.equal(byActorAndAction.items[0].id, 'evt-2');

  const byDateRange = await platformAuditList(service, {
    from: '2026-05-27T11:00:00.000Z',
    to: '2026-05-27T12:30:00.000Z',
  });
  assert.deepEqual(byDateRange.items.map((event) => event.id), ['evt-2']);
});
