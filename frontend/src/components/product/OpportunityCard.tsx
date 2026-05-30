import type { ComponentProps, HTMLAttributes, ReactNode } from 'react'

import { PriorityBadge } from './PriorityBadge'
import { StatusPill } from './StatusPill'
import { productSurfaceBase, productSurfaceStyle } from './styles'
import { cn } from '@/lib/cn'

interface OpportunityCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  account?: string
  accountSub?: string
  /** Classe CSS opcional para estilizar accountSub — ex: cores de aviso customizadas */
  accountSubClass?: string
  value?: string
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
  style,
  ...props
}: OpportunityCardProps) {
  return (
    <article
      className={cn(productSurfaceBase, 'p-3 shadow-sm', className)}
      style={{ ...productSurfaceStyle, ...style }}
      {...props}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>{title}</h4>
        <PriorityBadge priority={priority} />
      </div>
      {account ? (
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{account}</p>
      ) : null}
      {accountSub ? (
        <p
          className={cn('mt-0.5 text-xs font-medium', accountSubClass)}
          style={accountSubClass ? undefined : { color: 'var(--text-muted)' }}
        >
          {accountSub}
        </p>
      ) : null}
      {value ? (
        <p className="mt-2 text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--text-muted)' }}>{value}</p>
      ) : null}
      {badges ? <div className="mt-2 flex flex-wrap gap-1.5">{badges}</div> : null}
      {footer ? (
        <div className="mt-3 border-t pt-2" style={{ borderColor: 'var(--border-default)' }}>
          {footer}
        </div>
      ) : null}
    </article>
  )
}
