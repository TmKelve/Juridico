import type { HTMLAttributes, ReactNode } from 'react'

import { AlertTriangle, ArrowDown, ArrowUp, Minus } from 'lucide-react'

import { cn } from '@/lib/cn'

type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent'

interface PriorityBadgeProps extends HTMLAttributes<HTMLDivElement> {
  priority: PriorityLevel
  label?: string
}

const priorityClass: Record<PriorityLevel, string> = {
  low: 'border-slate-200 bg-slate-50 text-slate-700',
  medium: 'border-sky-200 bg-sky-50 text-sky-700',
  high: 'border-amber-200 bg-amber-50 text-amber-700',
  urgent: 'border-rose-200 bg-rose-50 text-rose-700',
}

const priorityIcon: Record<PriorityLevel, ReactNode> = {
  low: <ArrowDown className="h-3.5 w-3.5" aria-hidden />,
  medium: <Minus className="h-3.5 w-3.5" aria-hidden />,
  high: <ArrowUp className="h-3.5 w-3.5" aria-hidden />,
  urgent: <AlertTriangle className="h-3.5 w-3.5" aria-hidden />,
}

export function PriorityBadge({ priority, label, className, ...props }: PriorityBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium capitalize',
        priorityClass[priority],
        className,
      )}
      {...props}
    >
      {priorityIcon[priority]}
      <span>{label ?? priority}</span>
    </div>
  )
}
