import type { ComponentProps, HTMLAttributes, ReactNode } from 'react'

import { PriorityBadge } from './PriorityBadge'
import { StatusPill } from './StatusPill'
import { productSurfaceBase } from './styles'
import { cn } from '@/lib/cn'

interface OpportunityCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  /** Texto principal de origem (ex: "Publicação automatizada") */
  account?: string
  /** Texto secundário (ex: responsável ou aviso "Sem responsável") */
  accountSub?: string
  /** CSS class opcional no accountSub para estilizar avisos */
  accountSubClass?: string
  value?: string
  /** Linha de chips/badges exibida após o value — passe <span className="crm-chip ..."> */
  badges?: ReactNode
  status?: ComponentProps<typeof StatusPill>['tone']
  statusLabel?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  footer?: ReactNode
}

export function OpportunityCard({
  title,
  account,
  accountSub,
  accountSubClass,
  value,
  badges,
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
        <h4 className="text-sm font-semibold text-slate-900 leading-snug">{title}</h4>
        <PriorityBadge priority={priority} />
      </div>
      {account ? <p className="mt-1 text-xs text-slate-500">{account}</p> : null}
      {accountSub ? (
        <p className={cn('mt-0.5 text-xs font-medium', accountSubClass ?? 'text-slate-400')}>{accountSub}</p>
      ) : null}
      {value ? <p className="mt-2 text-xs text-slate-500 leading-relaxed line-clamp-3">{value}</p> : null}
      {badges ? <div className="mt-2 flex flex-wrap gap-1.5">{badges}</div> : null}
      {footer ? <div className="mt-3 border-t border-slate-200 pt-2">{footer}</div> : null}
    </article>
  )
}
