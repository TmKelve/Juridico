import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { productSurfaceBase, productSurfaceStyle } from './styles'

export type KpiCategory = 'warning' | 'info' | 'error' | 'primary' | 'success'

interface KpiCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string
  value: string
  delta?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: ReactNode
  /** Liga o ícone aos tokens --kpi-accent-* e --kpi-bg-* de tokens.css */
  category?: KpiCategory
}

const trendStyle: Record<NonNullable<KpiCardProps['trend']>, CSSProperties> = {
  up:      { color: 'var(--success-700)', backgroundColor: 'var(--success-100)' },
  down:    { color: 'var(--error-700)',   backgroundColor: 'var(--error-100)'   },
  neutral: { color: 'var(--neutral-700)', backgroundColor: 'var(--neutral-100)' },
}

const categoryIconStyle: Record<KpiCategory, CSSProperties> = {
  warning: { color: 'var(--kpi-accent-warning)', backgroundColor: 'var(--kpi-bg-warning)' },
  info:    { color: 'var(--kpi-accent-info)',    backgroundColor: 'var(--kpi-bg-info)'    },
  error:   { color: 'var(--kpi-accent-error)',   backgroundColor: 'var(--kpi-bg-error)'   },
  primary: { color: 'var(--kpi-accent-primary)', backgroundColor: 'var(--kpi-bg-primary)' },
  success: { color: 'var(--kpi-accent-success)', backgroundColor: 'var(--kpi-bg-success)' },
}

export function KpiCard({
  label,
  value,
  delta,
  trend = 'neutral',
  icon,
  category,
  className,
  style,
  ...props
}: KpiCardProps) {
  return (
    <section
      className={cn(productSurfaceBase, 'p-4', className)}
      style={{ ...productSurfaceStyle, ...style }}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</p>
        {icon ? (
          <div
            className="rounded-md p-1.5"
            style={category ? categoryIconStyle[category] : { color: 'var(--text-muted)' }}
          >
            {icon}
          </div>
        ) : null}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
        {delta ? (
          <span
            className="rounded-md px-2 py-1 text-xs font-medium"
            style={trendStyle[trend]}
          >
            {delta}
          </span>
        ) : null}
      </div>
    </section>
  )
}
