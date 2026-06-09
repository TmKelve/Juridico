import { PageHeader } from '@/components/product/PageHeader'
import {
  InviteList,
  MembershipTable,
  WorkspaceRoleSummary,
} from '@/components/platform-admin/memberships/MembershipPanels'
import type { MembershipRole, MembershipWorkspaceView } from './types'

interface PlatformAdminMembershipsScreenProps {
  workspace: MembershipWorkspaceView
  onChangeRole: (membershipId: string, role: MembershipRole) => void
}

export function PlatformAdminMembershipsScreen({ workspace, onChangeRole }: PlatformAdminMembershipsScreenProps) {
  return (
    <section className="space-y-4">
      <PageHeader
        title="Colaboradores e Convites"
        subtitle="Gestão de perfis, acessos e convites pendentes"
        badge="Platform Admin"
      />
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <MembershipTable memberships={workspace.memberships} onChangeRole={onChangeRole} />
        <div className="space-y-4">
          <InviteList invites={workspace.invites} />
          <WorkspaceRoleSummary workspace={workspace} />
        </div>
      </div>
    </section>
  )
}
