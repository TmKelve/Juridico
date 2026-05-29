import { CompanyStatusBadge } from '@/components/company/CompanyStatusBadge'
import { PlatformTenantBadge } from '@/components/platform/PlatformTenantBadge'
import type { CompanyFoundationView } from './types'

interface CompanyFoundationPanelProps {
  data: CompanyFoundationView
}

export function CompanyFoundationPanel({ data }: CompanyFoundationPanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Administração Base</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">{data.companyName}</h2>
          <p className="text-xs text-slate-500">ID: {data.companyId}</p>
        </div>
        <CompanyStatusBadge status={data.status} />
      </header>

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-slate-800">Memberships</h3>
        <ul className="mt-2 space-y-2">
          {data.memberships.map((membership) => (
            <li
              key={membership.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{membership.userName}</p>
                <p className="text-xs text-slate-500">{membership.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-600">{membership.role}</span>
                <PlatformTenantBadge scope={membership.scope} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
