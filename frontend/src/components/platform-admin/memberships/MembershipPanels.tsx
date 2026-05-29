import { PlatformTenantBadge } from '@/components/platform/PlatformTenantBadge'
import type {
  MembershipInviteView,
  MembershipRole,
  MembershipView,
  MembershipWorkspaceView,
} from '@/platform-admin/memberships/types'

const roleOptions: MembershipRole[] = ['owner', 'admin', 'manager', 'member', 'billing', 'viewer']

interface MembershipTableProps {
  memberships: MembershipView[]
  onChangeRole: (membershipId: string, role: MembershipRole) => void
}

export function MembershipTable({ memberships, onChangeRole }: MembershipTableProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Colaboradores</h2>
        <span className="text-xs text-slate-500">{memberships.length} ativos</span>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Escopo</th>
              <th className="px-3 py-2">Perfil</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {memberships.map((membership) => (
              <tr key={membership.id}>
                <td className="px-3 py-2 font-medium text-slate-900">{membership.userName}</td>
                <td className="px-3 py-2 text-slate-700">{membership.email}</td>
                <td className="px-3 py-2">
                  <PlatformTenantBadge scope={membership.scope} />
                </td>
                <td className="px-3 py-2">
                  <label className="sr-only" htmlFor={`membership-role-${membership.id}`}>
                    Perfil
                  </label>
                  <select
                    id={`membership-role-${membership.id}`}
                    value={membership.role}
                    onChange={(event) => onChangeRole(membership.id, event.target.value as MembershipRole)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

interface InviteListProps {
  invites: MembershipInviteView[]
}

export function InviteList({ invites }: InviteListProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Convites Pendentes</h2>
        <span className="text-xs text-slate-500">{invites.length} pendente(s)</span>
      </header>
      <ul className="space-y-2">
        {invites.map((invite) => (
          <li key={invite.id} className="rounded-lg border border-slate-200 px-3 py-2">
            <p className="text-sm font-medium text-slate-900">{invite.email}</p>
            <p className="text-xs text-slate-600">
              Perfil {invite.role} • expira em {invite.expiresAtLabel}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

interface WorkspaceRoleSummaryProps {
  workspace: MembershipWorkspaceView
}

export function WorkspaceRoleSummary({ workspace }: WorkspaceRoleSummaryProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900">Perfis por Escopo</h2>
        <p className="text-xs text-slate-500">Visão operacional para governança</p>
      </header>
      <ul className="space-y-2">
        {workspace.roleSummary.map((item) => (
          <li key={`${item.scope}-${item.role}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
            <div className="flex items-center gap-2">
              <PlatformTenantBadge scope={item.scope} />
              <span className="text-sm font-medium text-slate-800">{item.role}</span>
            </div>
            <span className="text-sm font-semibold text-slate-900">{item.count}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
