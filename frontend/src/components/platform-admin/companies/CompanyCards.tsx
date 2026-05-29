import { CompanyStatusBadge } from '@/components/company/CompanyStatusBadge'
import { PlatformTenantBadge } from '@/components/platform/PlatformTenantBadge'
import type { CompanyAdminAction, CompanyDetailView, CompanyListItemView } from '@/platform-admin/companies/types'

interface CompanyListCardProps {
  companies: CompanyListItemView[]
  selectedCompanyId: string | null
  onSelectCompany: (companyId: string) => void
}

function getActionTone(action: CompanyAdminAction['type']): string {
  if (action === 'suspend') return 'border-rose-200 bg-rose-50 text-rose-700'
  if (action === 'activate') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

interface CompanyDetailPanelProps {
  company: CompanyDetailView | null
  onAction: (action: CompanyAdminAction) => void
}

export function CompanyListCard({ companies, selectedCompanyId, onSelectCompany }: CompanyListCardProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Empresas</h2>
        <span className="text-xs text-slate-500">{companies.length} registro(s)</span>
      </header>
      <ul className="space-y-2">
        {companies.map((company) => {
          const isSelected = selectedCompanyId === company.id
          return (
            <li key={company.id}>
              <button
                type="button"
                onClick={() => onSelectCompany(company.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                  isSelected
                    ? 'border-sky-300 bg-sky-50'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{company.name}</p>
                    <p className="text-xs text-slate-500">ID: {company.id}</p>
                  </div>
                  <CompanyStatusBadge status={company.status} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span>{company.membersCount} colaboradores</span>
                  <span aria-hidden="true">•</span>
                  <span>{company.pendingInvitesCount} convites pendentes</span>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function CompanyDetailPanel({ company, onAction }: CompanyDetailPanelProps) {
  if (!company) {
    return (
      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        Selecione uma empresa para visualizar detalhes administrativos.
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Detalhe da Empresa</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">{company.name}</h2>
          <p className="text-xs text-slate-500">Tenant: {company.tenantSlug}</p>
        </div>
        <div className="flex items-center gap-2">
          <CompanyStatusBadge status={company.status} />
          <PlatformTenantBadge scope={company.scope} />
        </div>
      </header>

      <dl className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Responsável</dt>
          <dd className="font-medium text-slate-900">{company.ownerName}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Plano</dt>
          <dd className="font-medium text-slate-900">{company.planName}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Colaboradores</dt>
          <dd className="font-medium text-slate-900">{company.membersCount}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Convites Pendentes</dt>
          <dd className="font-medium text-slate-900">{company.pendingInvitesCount}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {company.actions.map((action) => (
          <button
            key={action.type}
            type="button"
            onClick={() => onAction(action)}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${getActionTone(action.type)}`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  )
}
