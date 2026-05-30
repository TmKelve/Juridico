import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { productSurfaceBase, productSurfaceStyle } from './styles'

interface ExecutiveCardProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode
  title: string
  description?: string
  value?: string
  footer?: ReactNode
}

export function ExecutiveCard({
  header,
  title,
  description,
  value,
  footer,
  className,
  style,
  children,
  ...props
}: ExecutiveCardProps) {
  return (
    <section
      className={cn(productSurfaceBase, 'p-5', className)}
      style={{ ...productSurfaceStyle, ...style }}
      {...props}
    >
      {header ? <div className="mb-3">{header}</div> : null}
      <div className="space-y-1">
        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        {description ? <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{description}</p> : null}
      </div>
      {value ? <p className="mt-4 text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
      {footer ? (
        <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--border-default)' }}>
          {footer}
        </div>
      ) : null}
    </section>
  )
}
