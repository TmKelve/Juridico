import { PageHeader } from '@/dashboard/layout/PageHeader'
import { AuditTimeline } from '@/components/platform-admin/audit/AuditTimeline'
import type { PlatformAuditEntryView } from './types'

interface PlatformAdminAuditScreenProps {
  entries: PlatformAuditEntryView[]
}

export function PlatformAdminAuditScreen({ entries }: PlatformAdminAuditScreenProps) {
  return (
    <section className="space-y-4">
      <PageHeader
        title="Auditoria de Plataforma"
        subtitle="Timeline de eventos administrativos para rastreabilidade"
        badge="Platform Admin"
      />
      <AuditTimeline entries={entries} />
    </section>
  )
}
