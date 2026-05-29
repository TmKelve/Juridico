import type {
  InviteApiItem,
  MembershipApiItem,
  MembershipInviteView,
  MembershipRole,
  MembershipRoleSummaryItem,
  MembershipView,
  MembershipWorkspaceApi,
  MembershipWorkspaceView,
} from './types'

const allowedRoles: MembershipRole[] = ['owner', 'admin', 'manager', 'member', 'billing', 'viewer']

function normalizeRole(input?: string): MembershipRole {
  const role = (input ?? '').toLowerCase() as MembershipRole
  return allowedRoles.includes(role) ? role : 'viewer'
}

function normalizeScope(input?: string): 'platform' | 'tenant' {
  return input === 'platform' ? 'platform' : 'tenant'
}

function formatDateLabel(value?: string): string {
  if (!value) return 'sem expiração definida'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'data inválida'
  return parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function normalizeMembership(item: MembershipApiItem, index: number): MembershipView {
  return {
    id: String(item.id ?? `membership-${index}`),
    userName: item.userName ?? 'Usuário não informado',
    email: item.email ?? 'email@indefinido.local',
    scope: normalizeScope(item.scope),
    role: normalizeRole(item.role),
  }
}

function normalizeInvite(item: InviteApiItem, index: number): MembershipInviteView {
  return {
    id: String(item.id ?? `invite-${index}`),
    email: item.email ?? 'email@indefinido.local',
    role: normalizeRole(item.role),
    expiresAtLabel: formatDateLabel(item.expiresAt),
  }
}

function buildRoleSummary(memberships: MembershipView[]): MembershipRoleSummaryItem[] {
  const counts = new Map<string, number>()
  memberships.forEach((membership) => {
    const key = `${membership.scope}:${membership.role}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })

  return Array.from(counts.entries()).map(([key, count]) => {
    const [scope, role] = key.split(':')
    return {
      scope: scope === 'platform' ? 'platform' : 'tenant',
      role: normalizeRole(role),
      count,
    }
  })
}

export function normalizeMembershipWorkspace(payload: MembershipWorkspaceApi): MembershipWorkspaceView {
  const memberships = (payload.memberships ?? []).map(normalizeMembership)
  const invites = (payload.invites ?? []).map(normalizeInvite)

  return {
    memberships,
    invites,
    roleSummary: buildRoleSummary(memberships),
  }
}
