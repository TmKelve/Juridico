import type { CompanyStatus } from '@/components/company/CompanyStatusBadge'

export interface CompanyAdminAction {
  type: 'suspend' | 'activate' | 'reset_owner_password'
  label: string
}

export interface CompanyListItemView {
  id: string
  name: string
  tenantSlug: string
  status: CompanyStatus
  scope: 'platform' | 'tenant'
  membersCount: number
  pendingInvitesCount: number
}

export interface CompanyDetailView extends CompanyListItemView {
  ownerName: string
  planName: string
  actions: CompanyAdminAction[]
}

export interface CompanyAdminApiItem {
  id?: string | number
  name?: string
  tenantSlug?: string
  status?: string
  scope?: string
  membersCount?: number
  pendingInvitesCount?: number
  ownerName?: string
  planName?: string
}

export interface CompanyAdminListApi {
  companies?: CompanyAdminApiItem[]
}

export interface CompanyAdminDetailApi {
  company?: CompanyAdminApiItem
}
