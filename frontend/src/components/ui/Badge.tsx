import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

type BadgeVariant = 'default' | 'neutral'

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return <div className={cn('ui-badge', `ui-badge--${variant}`, className)} {...props} />
}
