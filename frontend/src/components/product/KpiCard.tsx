import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { productSurfaceBase } from './styles'

interface KpiCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string
  value: string
  delta?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: ReactNode
}

const trendTone: Record<NonNullable<KpiCardProps['trend']>, string> = {
  up: 'text-emerald-700 bg-emerald-50',
  down: 'text-rose-700 bg-rose-50',
  neutral: 'text-slate-700 bg-slate-100',
}

export function KpiCard({
  label,
  value,
  delta,
  trend = 'neutral',
  icon,
  className,
  ...props
}: KpiCardProps) {
  return (
    <section className={cn(productSurfaceBase, 'p-4', className)} {...props}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500">{label}</p>
        {icon ? <div>{icon}</div> : null}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        {delta ? (
          <span className={cn('rounded-md px-2 py-1 text-xs font-medium', trendTone[trend])}>{delta}</span>
        ) : null}
      </div>
    </section>
  )
}
