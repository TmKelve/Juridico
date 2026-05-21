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
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            {typeof count === 'number' ? (
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                {count}
              </span>
            ) : null}
          </div>
          {typeof count === 'number' ? (
            <span className="mt-0.5 block text-[11px] text-slate-400 leading-none">
              {count} oportunidade{count !== 1 ? 's' : ''}
            </span>
          ) : null}
        </div>
        {actions}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
