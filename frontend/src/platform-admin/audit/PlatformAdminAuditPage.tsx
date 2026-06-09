import { useState, useEffect } from 'react'
import { api } from '@/api'
import { PlatformAdminAuditScreen } from './PlatformAdminAuditScreen'
import { normalizePlatformAudit } from './normalize'
import type { PlatformAuditEntryView } from './types'

export function PlatformAdminAuditPage() {
  const [entries, setEntries] = useState<PlatformAuditEntryView[]>([])

  useEffect(() => {
    api.getPlatformAdminAuditTimeline({ limit: 50 }).then((res) => {
      if (res.status === 200) setEntries(normalizePlatformAudit(res.data))
    })
  }, [])

  return <PlatformAdminAuditScreen entries={entries} />
}
