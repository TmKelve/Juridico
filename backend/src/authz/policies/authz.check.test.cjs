const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const authzCheckPath = path.resolve(__dirname, '..', '..', '..', 'dist', 'authz', 'policies', 'authz.check.js');
const permissionsPath = path.resolve(__dirname, '..', '..', '..', 'dist', 'authz', 'rbac', 'permissions.js');
const guardPath = path.resolve(__dirname, '..', '..', '..', 'dist', 'authz', 'guards', 'authz.guard.js');

test('authz matrix allows explicit global sensitive permission for ADM', async () => {
  const { checkAuthorization } = require(authzCheckPath);

  const decision = checkAuthorization({
    actor: { userId: 1, role: 'ADM' },
    permissionKey: 'team.reassignPortfolio',
    resourceType: 'team',
    resourceId: 9,
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.scope, 'global');
  assert.equal(decision.sensitive, true);
  assert.equal(decision.requiresAudit, true);
});

test('authz matrix resolves own scope for ADV task updates', async () => {
  const { checkAuthorization } = require(authzCheckPath);

  const decision = checkAuthorization({
    actor: { userId: 21, role: 'ADV', teamIds: [7], portfolioIds: [31] },
    permissionKey: 'task.update',
    resourceType: 'task',
    resourceId: 88,
    context: { ownerUserId: 21, teamId: 7, portfolioId: 31 },
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.scope, 'own');
  assert.equal(decision.reason, 'AUTHZ_ALLOWED_OWN');
});

test('authz matrix denies sensitive attendance closure by default for ATD', async () => {
  const { checkAuthorization } = require(authzCheckPath);

  const decision = checkAuthorization({
    actor: { userId: 33, role: 'ATD', teamIds: [4] },
    permissionKey: 'attendance.closeOutOfSla',
    resourceType: 'attendance',
    resourceId: 55,
    context: { ownerUserId: 33, teamId: 4 },
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.scope, 'denied');
  assert.equal(decision.reason, 'AUTHZ_SENSITIVE_DENY_BY_DEFAULT');
});

test('authz matrix respects team scope and route-level scope narrowing', async () => {
  const { checkAuthorization } = require(authzCheckPath);

  const allowed = checkAuthorization({
    actor: { userId: 42, role: 'ATD', teamIds: ['team-a'] },
    permissionKey: 'attendance.create',
    resourceType: 'attendance',
    context: { teamId: 'team-a', allowedScopes: ['team'] },
  });

  const denied = checkAuthorization({
    actor: { userId: 42, role: 'ATD', teamIds: ['team-a'] },
    permissionKey: 'attendance.create',
    resourceType: 'attendance',
    context: { teamId: 'team-a', allowedScopes: ['own'] },
  });

  assert.equal(allowed.allowed, true);
  assert.equal(allowed.scope, 'team');
  assert.equal(denied.allowed, false);
  assert.equal(denied.reason, 'AUTHZ_SCOPE_OUTSIDE_ROUTE_POLICY');
});

test('authz matrix covers portfolio and export permissions explicitly', async () => {
  const { checkAuthorization } = require(authzCheckPath);
  const { listAuthzPermissionCatalog, listAuthzPermissions } = require(permissionsPath);

  const portfolioDecision = checkAuthorization({
    actor: { userId: 60, role: 'ADV', portfolioIds: [901] },
    permissionKey: 'productivity.snapshot',
    resourceType: 'productivity',
    resourceId: 901,
    context: { portfolioId: 901 },
  });

  const exportDecision = checkAuthorization({
    actor: { userId: 3, role: 'FIN' },
    permissionKey: 'export.productivity',
    resourceType: 'export',
    resourceId: '2026-05-25',
  });

  const finCatalog = listAuthzPermissionCatalog('FIN');

  assert.equal(portfolioDecision.allowed, true);
  assert.equal(portfolioDecision.scope, 'portfolio');
  assert.equal(exportDecision.allowed, true);
  assert.equal(exportDecision.scope, 'global');
  assert.ok(listAuthzPermissions('FIN').includes('productivity.export'));
  assert.deepEqual(
    finCatalog.find((entry) => entry.key === 'export.productivity')?.grantedScopes,
    ['global'],
  );
});

test('authz matrix allows portfolio-scoped AI summary generation for ADV', async () => {
  const { checkAuthorization } = require(authzCheckPath);

  const decision = checkAuthorization({
    actor: { userId: 60, role: 'ADV', portfolioIds: [901] },
    permissionKey: 'ai.summary.generate',
    resourceType: 'ai',
    resourceId: 'publication:41',
    context: { portfolioId: 901 },
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.scope, 'portfolio');
  assert.equal(decision.requiresAudit, true);
});

test('authz matrix grants BI export globally for FIN and denies timesheet approval for ATD', async () => {
  const { checkAuthorization } = require(authzCheckPath);
  const { listAuthzPermissions } = require(permissionsPath);

  const biExportDecision = checkAuthorization({
    actor: { userId: 3, role: 'FIN' },
    permissionKey: 'bi.export.generate',
    resourceType: 'bi',
    resourceId: 'financial_consolidated',
  });

  const deniedTimesheetApproval = checkAuthorization({
    actor: { userId: 42, role: 'ATD', teamIds: [7] },
    permissionKey: 'timesheet.entry.approve',
    resourceType: 'timesheet',
    resourceId: 'entry-9',
    context: { teamId: 7 },
  });

  assert.equal(biExportDecision.allowed, true);
  assert.equal(biExportDecision.scope, 'global');
  assert.ok(listAuthzPermissions('FIN').includes('bi.export.generate'));
  assert.equal(deniedTimesheetApproval.allowed, false);
  assert.equal(deniedTimesheetApproval.reason, 'AUTHZ_SENSITIVE_DENY_BY_DEFAULT');
});

test('guard throws with the computed decision when permission is denied', async () => {
  const { ensureAuthorized, AuthzForbiddenError } = require(guardPath);

  assert.throws(
    () =>
      ensureAuthorized({
        actor: { userId: 9, role: 'FIN' },
        permissionKey: 'team.assignOwnership',
        resourceType: 'team',
        resourceId: 14,
      }),
    (error) => {
      assert.ok(error instanceof AuthzForbiddenError);
      assert.equal(error.decision.reason, 'AUTHZ_PERMISSION_DENIED');
      return true;
    },
  );
});

test('authz blocks mixed tenant/platform context', async () => {
  const { checkAuthorization } = require(authzCheckPath);

  const decision = checkAuthorization({
    actor: { userId: 1, role: 'platform_admin' },
    permissionKey: 'portfolio.view',
    resourceType: 'portfolio',
    context: { accessContext: 'tenant', allowedScopes: ['global'] },
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'AUTHZ_CONTEXT_MISMATCH');
});
