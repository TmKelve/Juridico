import type { ComponentProps } from 'react'

import { Badge } from '@/components/ui'
import { cn } from '@/lib/cn'

type StatusTone = 'positive' | 'warning' | 'critical' | 'neutral' | 'info'

interface StatusPillProps extends ComponentProps<typeof Badge> {
  tone?: StatusTone
}

const statusToneClass: Record<StatusTone, string> = {
  positive: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  critical: 'border-rose-200 bg-rose-50 text-rose-700',
  neutral: 'border-slate-200 bg-slate-100 text-slate-700',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
}

export function StatusPill({ tone = 'neutral', className, ...props }: StatusPillProps) {
  return (
    <Badge
      className={cn('inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium', statusToneClass[tone], className)}
      {...props}
    />
  )
}
