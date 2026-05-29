export type MembershipRole = 'owner' | 'admin' | 'manager' | 'member' | 'billing' | 'viewer'

export interface MembershipView {
  id: string
  userName: string
  email: string
  scope: 'platform' | 'tenant'
  role: MembershipRole
}

export interface MembershipInviteView {
  id: string
  email: string
  role: MembershipRole
  expiresAtLabel: string
}

export interface MembershipRoleSummaryItem {
  scope: 'platform' | 'tenant'
  role: MembershipRole
  count: number
}

export interface MembershipWorkspaceView {
  memberships: MembershipView[]
  invites: MembershipInviteView[]
  roleSummary: MembershipRoleSummaryItem[]
}

export interface MembershipApiItem {
  id?: string | number
  userName?: string
  email?: string
  scope?: string
  role?: string
}

export interface InviteApiItem {
  id?: string | number
  email?: string
  role?: string
  expiresAt?: string
}

export interface MembershipWorkspaceApi {
  memberships?: MembershipApiItem[]
  invites?: InviteApiItem[]
}
