import type { HTMLAttributes } from 'react'

import { Separator } from '@/components/ui'
import { cn } from '@/lib/cn'

interface DrawerSectionProps extends HTMLAttributes<HTMLElement> {
  title: string
  description?: string
}

export function DrawerSection({
  title,
  description,
  className,
  children,
  ...props
}: DrawerSectionProps) {
  return (
    <section className={cn('space-y-3', className)} {...props}>
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        {description ? <p className="text-xs text-slate-500">{description}</p> : null}
      </div>
      <Separator />
      <div>{children}</div>
    </section>
  )
}
