const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const auditModulePath = path.resolve(__dirname, '..', 'dist', 'platform', 'audit', 'index.js');
const adminModulePath = path.resolve(__dirname, '..', 'dist', 'platform', 'admin-logins', 'index.js');
const supportModulePath = path.resolve(__dirname, '..', 'dist', 'platform', 'support', 'index.js');

test('platform-audit integration: admin logins, unauthorized attempt and supportView read-only emit reusable audit events', async () => {
  const { InMemoryPlatformAuditRepository, PlatformAuditService, platformAuditList } = require(auditModulePath);
  const { PlatformAdminLoginsService } = require(adminModulePath);
  const { PlatformSupportService, InMemoryPlatformSupportContextRepository } = require(supportModulePath);

  const auditService = new PlatformAuditService(new InMemoryPlatformAuditRepository());
  const adminLogins = new PlatformAdminLoginsService(auditService);
  const supportService = new PlatformSupportService(
    new InMemoryPlatformSupportContextRepository({
      33: {
        overview: { openTickets: 2, lastIncidentAt: '2026-05-26T09:00:00.000Z' },
      },
    }),
    auditService.createRecorder({ companyId: 33, actor: 'support:12' }),
  );

  const granted = await adminLogins.recordLoginSuccess({
    companyId: 33,
    actor: 'user:101',
    adminUserId: 101,
    email: 'admin@example.com',
    ip: '127.0.0.9',
  });
  assert.equal(granted.mode, 'granted');
  assert.equal(granted.auditEvent.action, 'platform.adminLogin.success');

  const denied = await adminLogins.recordLoginDenied({
    companyId: 33,
    actor: 'user:102',
    reason: 'INVALID_PASSWORD',
  });
  assert.equal(denied.mode, 'denied');
  assert.equal(denied.auditEvent.action, 'platform.adminLogin.denied');

  const unauthorized = await adminLogins.recordUnauthorizedAccess({
    companyId: 33,
    actor: 'user:102',
    resource: 'platform.company.secrets',
    reason: 'ROLE_NOT_ALLOWED',
  });
  assert.equal(unauthorized.action, 'platform.access.unauthorizedAttempt');
  assert.equal(unauthorized.status, 'error');

  const supportView = await supportService.supportView({
    companyId: 33,
    actor: 'support:12',
    supportUserId: 12,
    section: 'overview',
  });
  assert.equal(supportView.mode, 'supportView');
  assert.equal(supportView.readOnly, true);
  assert.equal(supportView.context.readOnly, true);
  assert.equal(supportView.auditEvent.action, 'platform.support.view');

  const companyAudit = await platformAuditList(auditService, { companyId: 33, limit: 10 });
  assert.equal(companyAudit.items.length, 4);
  assert.equal(companyAudit.items.some((event) => event.action === 'platform.access.unauthorizedAttempt'), true);
  assert.equal(companyAudit.items.some((event) => event.action === 'platform.support.view'), true);
});
