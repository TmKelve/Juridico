import { PageHeader } from '@/dashboard/layout/PageHeader'
import { PlatformAdminSupportPanel } from './SupportContextPanel'
import type { SupportContextItem } from './types'

interface PlatformAdminSupportScreenProps {
  contexts: SupportContextItem[]
}

export function PlatformAdminSupportScreen({ contexts }: PlatformAdminSupportScreenProps) {
  return (
    <section className="space-y-4">
      <PageHeader
        title="Suporte Contextual"
        subtitle="Informações operacionais de apoio para decisões administrativas"
        badge="Read-only"
      />
      <PlatformAdminSupportPanel contexts={contexts} />
    </section>
  )
}
