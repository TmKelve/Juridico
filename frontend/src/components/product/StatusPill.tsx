import type { CSSProperties, ComponentProps } from 'react'

import { Badge } from '@/components/ui'
import { cn } from '@/lib/cn'

export type StatusTone = 'positive' | 'warning' | 'critical' | 'neutral' | 'info'

interface StatusPillProps extends ComponentProps<typeof Badge> {
  tone?: StatusTone
}

const toneStyle: Record<StatusTone, CSSProperties> = {
  positive: { color: 'var(--success-700)', backgroundColor: 'var(--success-100)', borderColor: 'var(--success-100)' },
  warning:  { color: 'var(--warning-700)', backgroundColor: 'var(--warning-100)', borderColor: 'var(--warning-100)' },
  critical: { color: 'var(--error-700)',   backgroundColor: 'var(--error-100)',   borderColor: 'var(--error-100)'   },
  neutral:  { color: 'var(--neutral-700)', backgroundColor: 'var(--neutral-100)', borderColor: 'var(--neutral-200)' },
  info:     { color: 'var(--info-700)',    backgroundColor: 'var(--info-100)',    borderColor: 'var(--info-100)'    },
}

export function StatusPill({ tone = 'neutral', className, style, ...props }: StatusPillProps) {
  return (
    <Badge
      className={cn('inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium', className)}
      style={{ ...toneStyle[tone], ...style }}
      {...props}
    />
  )
}
