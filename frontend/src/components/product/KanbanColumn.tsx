import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

interface KanbanColumnProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  count?: number
  actions?: ReactNode
}

export function KanbanColumn({
  title,
  count,
  actions,
  className,
  children,
  ...props
}: KanbanColumnProps) {
  return (
    <section
      className={cn('flex min-h-[240px] flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3', className)}
      {...props}
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">
          {title}
          {typeof count === 'number' ? <span className="ml-2 text-slate-500">({count})</span> : null}
        </h3>
        {actions}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
