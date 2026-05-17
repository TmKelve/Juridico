import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

type SeparatorOrientation = 'horizontal' | 'vertical'

export interface SeparatorProps extends HTMLAttributes<HTMLHRElement> {
  orientation?: SeparatorOrientation
}

export function Separator({ className, orientation = 'horizontal', ...props }: SeparatorProps) {
  return (
    <hr
      aria-orientation={orientation}
      className={cn('ui-separator', `ui-separator--${orientation}`, className)}
      {...props}
    />
  )
}
