import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'

import { AlertTriangle, ArrowDown, ArrowUp, Minus } from 'lucide-react'

import { cn } from '@/lib/cn'

export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent'

interface PriorityBadgeProps extends HTMLAttributes<HTMLDivElement> {
  priority: PriorityLevel
  label?: string
}

const priorityStyle: Record<PriorityLevel, CSSProperties> = {
  low:    { color: 'var(--neutral-700)', backgroundColor: 'var(--neutral-100)', borderColor: 'var(--neutral-200)' },
  medium: { color: 'var(--info-700)',    backgroundColor: 'var(--info-100)',    borderColor: 'var(--info-100)'    },
  high:   { color: 'var(--warning-700)', backgroundColor: 'var(--warning-100)', borderColor: 'var(--warning-100)' },
  urgent: { color: 'var(--error-700)',   backgroundColor: 'var(--error-100)',   borderColor: 'var(--error-100)'   },
}

const priorityIcon: Record<PriorityLevel, ReactNode> = {
  low:    <ArrowDown    className="h-3.5 w-3.5" aria-hidden />,
  medium: <Minus        className="h-3.5 w-3.5" aria-hidden />,
  high:   <ArrowUp      className="h-3.5 w-3.5" aria-hidden />,
  urgent: <AlertTriangle className="h-3.5 w-3.5" aria-hidden />,
}

export function PriorityBadge({ priority, label, className, style, ...props }: PriorityBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium capitalize',
        className,
      )}
      style={{ ...priorityStyle[priority], ...style }}
      {...props}
    >
      {priorityIcon[priority]}
      <span>{label ?? priority}</span>
    </div>
  )
}
