import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

export interface TimelineItem {
  id: string
  title: string
  description?: string
  date?: string
}

interface TimelineProps extends HTMLAttributes<HTMLOListElement> {
  items: TimelineItem[]
}

export function Timeline({ items, className, ...props }: TimelineProps) {
  return (
    <ol className={cn('space-y-4', className)} {...props}>
      {items.map((item) => (
        <li key={item.id} className="relative pl-6">
          <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-slate-400" />
          <span className="absolute left-[4px] top-4 h-[calc(100%-8px)] w-px bg-slate-200" />
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="text-sm font-medium text-slate-900">{item.title}</p>
            {item.description ? <p className="mt-1 text-sm text-slate-500">{item.description}</p> : null}
            {item.date ? <p className="mt-2 text-xs text-slate-400">{item.date}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
