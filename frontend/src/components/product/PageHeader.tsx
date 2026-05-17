import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

interface PageHeaderProps extends HTMLAttributes<HTMLElement> {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions, className, ...props }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-4', className)} {...props}>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  )
}
