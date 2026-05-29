import { cn } from '@/lib/cn'

export type CompanyStatus = 'active' | 'inactive' | 'suspended' | 'cancelled' | 'read_only' | 'grace_period'

interface CompanyStatusBadgeProps {
  status: CompanyStatus
}

const statusLabel: Record<CompanyStatus, string> = {
  active: 'Ativa',
  inactive: 'Inativa',
  suspended: 'Suspensa',
  cancelled: 'Cancelada',
  read_only: 'Somente leitura',
  grace_period: 'Carência',
}

const statusTone: Record<CompanyStatus, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  inactive: 'border-slate-200 bg-slate-100 text-slate-700',
  suspended: 'border-rose-200 bg-rose-50 text-rose-700',
  cancelled: 'border-slate-300 bg-slate-100 text-slate-500',
  read_only: 'border-amber-200 bg-amber-50 text-amber-700',
  grace_period: 'border-orange-200 bg-orange-50 text-orange-700',
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
