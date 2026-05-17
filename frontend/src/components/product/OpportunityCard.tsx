import type { ComponentProps, HTMLAttributes, ReactNode } from 'react'

import { PriorityBadge } from './PriorityBadge'
import { StatusPill } from './StatusPill'
import { productSurfaceBase } from './styles'
import { cn } from '@/lib/cn'

interface OpportunityCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  account?: string
  value?: string
  status?: ComponentProps<typeof StatusPill>['tone']
  statusLabel?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  footer?: ReactNode
}

export function OpportunityCard({
  title,
  account,
  value,
  status = 'neutral',
  statusLabel = 'Sem status',
  priority = 'medium',
  footer,
  className,
  ...props
}: OpportunityCardProps) {
  return (
    <article className={cn(productSurfaceBase, 'p-3 shadow-sm', className)} {...props}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        <PriorityBadge priority={priority} />
      </div>
      {account ? <p className="mt-1 text-xs text-slate-500">{account}</p> : null}
      {value ? <p className="mt-3 text-sm font-semibold text-slate-900">{value}</p> : null}
      <div className="mt-3">
        <StatusPill tone={status}>{statusLabel}</StatusPill>
      </div>
      {footer ? <div className="mt-3 border-t border-slate-200 pt-2">{footer}</div> : null}
    </article>
  )
}
