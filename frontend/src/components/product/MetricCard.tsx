import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { productSurfaceBase } from './styles'

interface MetricCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string
  value: string
  helper?: string
  icon?: ReactNode
}

export function MetricCard({ label, value, helper, icon, className, ...props }: MetricCardProps) {
  return (
    <section
      className={cn(productSurfaceBase, 'p-4 shadow-sm shadow-slate-200/30', className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-slate-500">{label}</p>
        {icon ? <div className="text-slate-500">{icon}</div> : null}
      </div>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </section>
  )
}
