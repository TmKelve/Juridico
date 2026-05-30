import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'

import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'

export type EmptyStateVariant = 'default' | 'error' | 'permission'

interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  icon?: ReactNode
  actionLabel?: string
  onAction?: () => void
  variant?: EmptyStateVariant
}

const variantStyle: Record<EmptyStateVariant, { container: CSSProperties; icon: CSSProperties }> = {
  default:    { container: { backgroundColor: 'var(--bg-subtle)',   borderColor: 'var(--border-default)' }, icon: { color: 'var(--text-muted)'  } },
  error:      { container: { backgroundColor: 'var(--error-100)',   borderColor: 'var(--error-600)'      }, icon: { color: 'var(--error-600)'   } },
  permission: { container: { backgroundColor: 'var(--neutral-100)', borderColor: 'var(--neutral-300)'    }, icon: { color: 'var(--neutral-500)' } },
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  variant = 'default',
  className,
  style,
  ...props
}: EmptyStateProps) {
  const { container, icon: iconStyle } = variantStyle[variant]

  return (
    <div
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center',
        className,
      )}
      style={{ ...container, ...style }}
      {...props}
    >
      {icon ? <div className="mb-3" style={iconStyle}>{icon}</div> : null}
      <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      {description
        ? <p className="mt-2 max-w-md text-sm" style={{ color: 'var(--text-secondary)' }}>{description}</p>
        : null}
      {actionLabel
        ? <Button className="mt-4" variant="outline" onClick={onAction}>{actionLabel}</Button>
        : null}
    </div>
  )
}
