import { cn } from '@/lib/cn'
import type { PlatformAuditEntryView } from '@/platform-admin/audit/types'

const toneByStatus: Record<PlatformAuditEntryView['status'], string> = {
  success: 'border-emerald-200 bg-emerald-50',
  warning: 'border-amber-200 bg-amber-50',
  error: 'border-rose-200 bg-rose-50',
}

interface AuditTimelineProps {
  entries: PlatformAuditEntryView[]
}

export function AuditTimeline({ entries }: AuditTimelineProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Timeline de Auditoria</h2>
        <span className="text-xs text-slate-500">{entries.length} evento(s)</span>
      </header>
      <ol className="space-y-2">
        {entries.map((entry) => (
          <li key={entry.id} className={cn('rounded-lg border px-3 py-2', toneByStatus[entry.status])}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{entry.action}</p>
              <span className="text-xs text-slate-600">{entry.occurredAtLabel}</span>
            </div>
            <p className="text-xs text-slate-700">
              {entry.actor} • {entry.entity}
            </p>
            <p className="mt-1 text-sm text-slate-700">{entry.summary}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
