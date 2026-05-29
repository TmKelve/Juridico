import { cn } from '@/lib/cn'

interface PlatformTenantBadgeProps {
  scope: 'platform' | 'tenant'
}

const scopeLabel: Record<'platform' | 'tenant', string> = {
  platform: 'Platform',
  tenant: 'Tenant',
}

const scopeTone: Record<'platform' | 'tenant', string> = {
  platform: 'border-sky-200 bg-sky-50 text-sky-700',
  tenant: 'border-violet-200 bg-violet-50 text-violet-700',
}

export function PlatformTenantBadge({ scope }: PlatformTenantBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
        scopeTone[scope],
      )}
    >
      {scopeLabel[scope]}
    </span>
  )
}
