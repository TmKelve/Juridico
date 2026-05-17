import type { HTMLAttributes, ReactNode } from 'react'

import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'

interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  icon?: ReactNode
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center',
        className,
      )}
      {...props}
    >
      {icon ? <div className="mb-3 text-slate-400">{icon}</div> : null}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p> : null}
      {actionLabel ? (
        <Button className="mt-4" variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
