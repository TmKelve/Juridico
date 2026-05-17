import type { LucideIcon } from 'lucide-react'
import { Bell, CircleHelp, LayoutGrid } from 'lucide-react'

interface TopbarIconBtnProps {
  icon: LucideIcon
  label: string
  badge?: number
  onClick?: () => void
  className?: string
}

function TopbarIconBtn({ icon: Icon, label, badge, onClick, className }: TopbarIconBtnProps) {
  return (
    <button
      type="button"
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-md border-none bg-transparent p-0 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${className || ''}`}
      aria-label={label}
      onClick={onClick}
    >
      <Icon size={18} strokeWidth={1.75} />
      {badge != null && badge > 0 && (
        <span className="pointer-events-none absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-rose-600 px-1 text-[10px] font-bold leading-none text-white" aria-label={`${badge} notificações`}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  )
}

interface TopbarActionsProps {
  notificationCount?: number
  onNotifications?: () => void
  onHelp?: () => void
  onShortcuts?: () => void
}

export function TopbarActions({
  notificationCount = 0,
  onNotifications,
  onHelp,
  onShortcuts,
}: TopbarActionsProps) {
  return (
    <div className="flex items-center gap-0.5">
      <TopbarIconBtn
        icon={Bell}
        label="Abrir notificações"
        badge={notificationCount}
        onClick={onNotifications}
      />
      <TopbarIconBtn
        icon={LayoutGrid}
        label="Abrir atalhos"
        onClick={onShortcuts}
        className="hidden md:inline-flex"
      />
      <TopbarIconBtn
        icon={CircleHelp}
        label="Abrir ajuda"
        onClick={onHelp}
        className="hidden md:inline-flex"
      />
    </div>
  )
}
