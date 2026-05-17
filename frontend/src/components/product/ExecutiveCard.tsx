import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { productSurfaceBase } from './styles'

interface ExecutiveCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  value?: string
  footer?: ReactNode
}

export function ExecutiveCard({
  title,
  description,
  value,
  footer,
  className,
  children,
  ...props
}: ExecutiveCardProps) {
  return (
    <section className={cn(productSurfaceBase, 'p-5', className)} {...props}>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      </div>
      {value ? <p className="mt-4 text-3xl font-semibold text-slate-900">{value}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
      {footer ? <div className="mt-4 border-t border-slate-200 pt-3">{footer}</div> : null}
    </section>
  )
}
