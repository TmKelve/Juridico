import type { CompanyStatus } from '@/components/company/CompanyStatusBadge'
import type {
  CompanyAdminAction,
  CompanyAdminApiItem,
  CompanyAdminDetailApi,
  CompanyAdminListApi,
  CompanyDetailView,
  CompanyListItemView,
} from './types'

function normalizeStatus(input?: string): CompanyStatus {
  if (input === 'suspended') return 'suspended'
  if (input === 'cancelled') return 'cancelled'
  if (input === 'read_only') return 'read_only'
  if (input === 'grace_period') return 'grace_period'
  return 'active'
}

function normalizeScope(input?: string): 'platform' | 'tenant' {
  return input === 'platform' ? 'platform' : 'tenant'
}

function normalizeActions(status: CompanyStatus): CompanyAdminAction[] {
  const base: CompanyAdminAction[] = [{ type: 'reset_owner_password', label: 'Resetar senha do responsável' }]
  if (status === 'active') return [...base, { type: 'suspend', label: 'Suspender empresa' }]
  return [...base, { type: 'activate', label: 'Reativar empresa' }]
}

function normalizeBaseCompany(item: CompanyAdminApiItem | undefined, fallbackIndex = 0): CompanyListItemView {
  const id = String(item?.id ?? `company-${fallbackIndex}`)
  const status = normalizeStatus(item?.status)

  return {
    id,
    name: item?.name ?? 'Empresa sem nome',
    tenantSlug: item?.tenantSlug ?? 'tenant-indefinido',
    status,
    scope: normalizeScope(item?.scope),
    membersCount: Number.isFinite(item?.membersCount) ? Number(item?.membersCount) : 0,
    pendingInvitesCount: Number.isFinite(item?.pendingInvitesCount) ? Number(item?.pendingInvitesCount) : 0,
  }
}

export function normalizeCompanyAdminList(payload: CompanyAdminListApi): CompanyListItemView[] {
  return (payload.companies ?? []).map((item, index) => normalizeBaseCompany(item, index))
}

export function normalizeCompanyAdminDetail(payload: CompanyAdminDetailApi): CompanyDetailView {
  const base = normalizeBaseCompany(payload.company)

  return {
    ...base,
    ownerName: payload.company?.ownerName ?? 'Responsável não informado',
    planName: payload.company?.planName ?? 'Plano padrão',
    actions: normalizeActions(base.status),
  }
}
