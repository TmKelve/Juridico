import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '@/api'
import { PlatformAdminMembershipsScreen } from './PlatformAdminMembershipsScreen'
import { normalizeMembershipWorkspace } from './normalize'
import type { MembershipRole, MembershipWorkspaceView } from './types'

const EMPTY_WORKSPACE: MembershipWorkspaceView = { memberships: [], invites: [], roleSummary: [] }

export function PlatformAdminMembershipsPage() {
  const [searchParams] = useSearchParams()
  const companyId = searchParams.get('companyId') ?? ''
  const [workspace, setWorkspace] = useState<MembershipWorkspaceView>(EMPTY_WORKSPACE)

  useEffect(() => {
    if (!companyId) return
    api.getPlatformAdminMemberships(companyId).then((res) => {
      if (res.status === 200) setWorkspace(normalizeMembershipWorkspace(res.data))
    })
  }, [companyId])

  if (!companyId) {
    return (
      <div className="page-content" style={{ color: 'var(--text-secondary)', padding: '2rem' }}>
        Selecione uma empresa na tela de Empresas para ver os colaboradores e convites.
      </div>
    )
  }

  async function handleChangeRole(membershipId: string, role: MembershipRole) {
    await api.updatePlatformAdminMembershipRole(companyId, membershipId, { role })
    const res = await api.getPlatformAdminMemberships(companyId)
    if (res.status === 200) setWorkspace(normalizeMembershipWorkspace(res.data))
  }

  return (
    <PlatformAdminMembershipsScreen
      workspace={workspace}
      onChangeRole={handleChangeRole}
    />
  )
}
