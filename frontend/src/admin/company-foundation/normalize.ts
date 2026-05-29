import type { CompanyStatus } from '@/components/company/CompanyStatusBadge'
import type { CompanyFoundationApi, CompanyFoundationView, CompanyMembershipView } from './types'

function normalizeCompanyStatus(input?: string): CompanyStatus {
  if (input === 'inactive') return 'inactive'
  if (input === 'suspended') return 'suspended'
  return 'active'
}

function normalizeScope(input?: string): CompanyMembershipView['scope'] {
  return input === 'platform' ? 'platform' : 'tenant'
}

export function normalizeCompanyFoundation(payload: CompanyFoundationApi): CompanyFoundationView {
  return {
    companyId: payload.company?.id ?? 'n/a',
    companyName: payload.company?.name ?? 'Empresa sem nome',
    status: normalizeCompanyStatus(payload.company?.status),
    memberships: (payload.memberships ?? []).map((item, index) => ({
      id: String(item.id ?? `membership-${index}`),
      userName: item.userName ?? 'Usuário não informado',
      email: item.email ?? 'email@indefinido.local',
      role: item.role ?? 'sem-perfil',
      scope: normalizeScope(item.scope),
    })),
  }
}
