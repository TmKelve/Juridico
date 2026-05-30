import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { productSurfaceBase, productSurfaceStyle } from './styles'

interface MetricCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string
  value: string
  helper?: string
  icon?: ReactNode
}

export function MetricCard({ label, value, helper, icon, className, style, ...props }: MetricCardProps) {
  return (
    <section
      className={cn(productSurfaceBase, 'p-4 shadow-sm', className)}
      style={{ ...productSurfaceStyle, ...style }}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</p>
        {icon ? <div style={{ color: 'var(--text-muted)' }}>{icon}</div> : null}
      </div>
      <p className="mt-2 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {helper ? <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{helper}</p> : null}
    </section>
  )
}
