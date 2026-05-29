import { expect, test } from '@playwright/test'

import {
  normalizeCompanyAdminDetail,
  normalizeCompanyAdminList,
} from './src/platform-admin/companies'
import { validateInvitationDraft } from './src/platform-admin/invitations'
import { normalizeMembershipWorkspace } from './src/platform-admin/memberships'
import { normalizePlatformAudit } from './src/platform-admin/audit'
import { normalizeSupportContext } from './src/platform-admin/support'

test('platform-admin smoke: normaliza empresas e ações administrativas', async () => {
  const list = normalizeCompanyAdminList({
    companies: [{ id: 'cmp-1', name: 'Juridico One', status: 'active', membersCount: 4, pendingInvitesCount: 1 }],
  })

  const detail = normalizeCompanyAdminDetail({
    company: {
      id: 'cmp-1',
      name: 'Juridico One',
      status: 'suspended',
      scope: 'platform',
      membersCount: 4,
      pendingInvitesCount: 1,
      ownerName: 'Ana',
      planName: 'Enterprise',
    },
  })

  expect(list).toHaveLength(1)
  expect(detail.actions.some((action) => action.type === 'activate')).toBeTruthy()
  expect(detail.scope).toBe('platform')
})

test('platform-admin smoke: memberships/convites/auditoria/suporte', async () => {
  const workspace = normalizeMembershipWorkspace({
    memberships: [
      { id: 'm-1', userName: 'Ana', email: 'ana@juridico.com', scope: 'platform', role: 'admin' },
      { id: 'm-2', userName: 'Bruno', email: 'bruno@juridico.com', scope: 'tenant', role: 'viewer' },
    ],
    invites: [{ id: 'i-1', email: 'novo@juridico.com', role: 'member', expiresAt: '2026-06-01T00:00:00.000Z' }],
  })

  const audit = normalizePlatformAudit({
    items: [{ id: 'a-1', action: 'company.suspend', status: 'warning', summary: 'Empresa suspensa por cobrança' }],
  })

  const support = normalizeSupportContext({
    items: [{ id: 's-1', title: 'Runbook', description: 'Passos para atendimento', owner: 'Ops', link: '/docs/runbook' }],
  })

  const invitation = validateInvitationDraft({
    email: 'convite@juridico.com',
    role: 'admin',
    scope: 'tenant',
  })

  expect(workspace.memberships).toHaveLength(2)
  expect(workspace.roleSummary.length).toBeGreaterThan(0)
  expect(audit[0]?.status).toBe('warning')
  expect(support[0]?.title).toBe('Runbook')
  expect(invitation.valid).toBeTruthy()
})
