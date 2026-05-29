import type { CompanyStatus } from '@/components/company/CompanyStatusBadge'

export interface CompanyMembershipView {
  id: string
  userName: string
  email: string
  role: string
  scope: 'platform' | 'tenant'
}

export interface CompanyFoundationView {
  companyId: string
  companyName: string
  status: CompanyStatus
  memberships: CompanyMembershipView[]
}

export interface CompanyFoundationApi {
  company?: {
    id?: string
    name?: string
    status?: string
  }
  memberships?: Array<{
    id?: string | number
    userName?: string
    email?: string
    role?: string
    scope?: string
  }>
}
