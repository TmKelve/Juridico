import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

interface PageHeaderProps extends HTMLAttributes<HTMLElement> {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions, className, ...props }: PageHeaderProps) {
  return (
    <header className={cn('flex items-start justify-between gap-4', className)} {...props}>
      <div className="min-w-0 flex-1 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle ? <p className="max-w-3xl text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  )
}
