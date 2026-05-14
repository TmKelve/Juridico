import type { LucideIcon } from 'lucide-react'
import { Bell, CircleHelp, LayoutGrid } from 'lucide-react'

interface TopbarIconBtnProps {
  icon: LucideIcon
  label: string
  badge?: number
  onClick?: () => void
}

function TopbarIconBtn({ icon: Icon, label, badge, onClick }: TopbarIconBtnProps) {
  return (
    <button
      type="button"
      className={`topbar-icon-btn${badge ? ' has-badge' : ''}`}
      aria-label={label}
      onClick={onClick}
    >
      <Icon size={18} strokeWidth={1.75} />
      {badge != null && badge > 0 && (
        <span className="topbar-badge" aria-label={`${badge} notificações`}>
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
    <div className="topbar-actions">
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
      />
      <TopbarIconBtn
        icon={CircleHelp}
        label="Abrir ajuda"
        onClick={onHelp}
      />
    </div>
  )
}
