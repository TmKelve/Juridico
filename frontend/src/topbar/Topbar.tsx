import { Menu } from 'lucide-react'
import { TopbarSearch } from './TopbarSearch'
import { TopbarActions } from './TopbarActions'
import { TopbarUserMenu } from './TopbarUserMenu'
import './topbar.css'

interface TopbarProps {
  userName: string
  avatarUrl?: string
  notificationCount?: number
  onMenuClick: () => void
  onNotifications?: () => void
  onHelp?: () => void
  onShortcuts?: () => void
}

export function Topbar({
  userName,
  avatarUrl,
  notificationCount = 0,
  onMenuClick,
  onNotifications,
  onHelp,
  onShortcuts,
}: TopbarProps) {
  return (
    <header className="topbar" role="banner">
      <div className="topbar-start">
        <button
          type="button"
          className="topbar-menu-btn"
          aria-label="Alternar navegação"
          onClick={onMenuClick}
        >
          <Menu size={18} strokeWidth={1.75} />
        </button>

        <TopbarSearch placeholder="Buscar..." />
      </div>

      <div className="topbar-end">
        <TopbarActions
          notificationCount={notificationCount}
          onNotifications={onNotifications}
          onHelp={onHelp}
          onShortcuts={onShortcuts}
        />

        <span className="topbar-separator" aria-hidden="true" />

        <TopbarUserMenu name={userName} avatarUrl={avatarUrl} />
      </div>
    </header>
  )
}
