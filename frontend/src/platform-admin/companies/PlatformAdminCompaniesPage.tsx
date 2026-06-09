import { useState, useEffect } from 'react'
import { api } from '@/api'
import { PlatformAdminCompaniesScreen } from './PlatformAdminCompaniesScreen'
import { normalizeCompanyAdminList, normalizeCompanyAdminDetail } from './normalize'
import type { CompanyAdminAction, CompanyDetailView, CompanyListItemView } from './types'

export function PlatformAdminCompaniesPage() {
  const [companies, setCompanies] = useState<CompanyListItemView[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [companyDetail, setCompanyDetail] = useState<CompanyDetailView | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getPlatformAdminCompanies().then((res) => {
      if (res.status === 200) setCompanies(normalizeCompanyAdminList(res.data))
      setLoading(false)
    })
  }, [])

  async function handleSelectCompany(companyId: string) {
    setSelectedCompanyId(companyId)
    setCompanyDetail(null)
    const res = await api.getPlatformAdminCompanyDetail(companyId)
    if (res.status === 200) setCompanyDetail(normalizeCompanyAdminDetail(res.data))
  }

  async function handleAction(action: CompanyAdminAction) {
    if (!selectedCompanyId) return
    await api.performPlatformAdminCompanyAction(selectedCompanyId, action)
    await handleSelectCompany(selectedCompanyId)
  }

  if (loading) return <div className="page-content" style={{ color: 'var(--text-secondary)' }}>Carregando empresas...</div>

  return (
    <PlatformAdminCompaniesScreen
      companies={companies}
      selectedCompanyId={selectedCompanyId}
      companyDetail={companyDetail}
      onSelectCompany={handleSelectCompany}
      onAction={handleAction}
    />
  )
}
