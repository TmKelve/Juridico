import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'

import { cn } from '@/lib/cn'

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close
export const SheetPortal = DialogPrimitive.Portal

export function SheetOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return <DialogPrimitive.Overlay className={cn('fixed inset-0 z-50 bg-slate-950/45', className)} {...props} />
}

type SheetSide = 'left' | 'right'
interface SheetContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  side?: SheetSide
}

export function SheetContent({ className, side = 'right', ...props }: SheetContentProps) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-0 z-50 h-full w-full max-w-[460px] border-slate-200 bg-white p-4 shadow-2xl',
          side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
          className,
        )}
        {...props}
      />
    </SheetPortal>
  )
}

export const SheetTitle = DialogPrimitive.Title
export const SheetDescription = DialogPrimitive.Description
