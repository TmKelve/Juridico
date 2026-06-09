import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

interface PageHeaderProps extends HTMLAttributes<HTMLElement> {
  title: string
  subtitle?: string
  badge?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, badge, actions, className, ...props }: PageHeaderProps) {
  return (
    <header className={cn('flex items-start justify-between gap-4', className)} {...props}>
      <div className="min-w-0 flex-1 space-y-1">
        {badge
          ? <span className="inline-block rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: 'var(--neutral-100)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>{badge}</span>
          : null}
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h1>
        {subtitle
          ? <p className="max-w-3xl text-sm" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
          : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  )
}
