import { PageHeader } from '@/components/product/PageHeader'
import { CompanyDetailPanel, CompanyListCard } from '@/components/platform-admin/companies/CompanyCards'
import type { CompanyAdminAction, CompanyDetailView, CompanyListItemView } from './types'

interface PlatformAdminCompaniesScreenProps {
  companies: CompanyListItemView[]
  selectedCompanyId: string | null
  companyDetail: CompanyDetailView | null
  onSelectCompany: (companyId: string) => void
  onAction: (action: CompanyAdminAction) => void
}

export function PlatformAdminCompaniesScreen({
  companies,
  selectedCompanyId,
  companyDetail,
  onSelectCompany,
  onAction,
}: PlatformAdminCompaniesScreenProps) {
  return (
    <section className="space-y-4">
      <PageHeader
        title="Console de Empresas"
        subtitle="Listagem e detalhe para administração de empresas na plataforma"
        badge="Platform Admin"
      />
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
        <CompanyListCard companies={companies} selectedCompanyId={selectedCompanyId} onSelectCompany={onSelectCompany} />
        <CompanyDetailPanel company={companyDetail} onAction={onAction} />
      </div>
    </section>
  )
}
