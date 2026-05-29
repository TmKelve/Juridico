import { cn } from '@/lib/cn'

export type CompanyStatus = 'active' | 'inactive' | 'suspended'

interface CompanyStatusBadgeProps {
  status: CompanyStatus
}

const statusLabel: Record<CompanyStatus, string> = {
  active: 'Ativa',
  inactive: 'Inativa',
  suspended: 'Suspensa',
}

const statusTone: Record<CompanyStatus, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  inactive: 'border-slate-200 bg-slate-100 text-slate-700',
  suspended: 'border-rose-200 bg-rose-50 text-rose-700',
}

export function CompanyStatusBadge({ status }: CompanyStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
        statusTone[status],
      )}
    >
      {statusLabel[status]}
    </span>
  )
}
