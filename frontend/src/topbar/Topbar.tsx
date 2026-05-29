import { Menu } from 'lucide-react'
import { TopbarSearch } from './TopbarSearch'
import { TopbarActions } from './TopbarActions'
import { TopbarUserMenu } from './TopbarUserMenu'
import './topbar.css'

interface TopbarProps {
  userName: string
  userEmail: string
  userRole: string
  avatarUrl?: string
  notificationCount?: number
  onMenuClick: () => void
  onLogout?: () => void
  onNotifications?: () => void
  onHelp?: () => void
  onShortcuts?: () => void
}

export function Topbar({
  userName,
  userEmail,
  userRole,
  avatarUrl,
  notificationCount = 0,
  onMenuClick,
  onLogout,
  onNotifications,
  onHelp,
  onShortcuts,
}: TopbarProps) {
  return (
    <header className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 md:px-4 lg:px-5" role="banner">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-none bg-transparent p-0 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          aria-label="Alternar navegação"
          onClick={onMenuClick}
        >
          <Menu size={18} strokeWidth={1.75} />
        </button>

        <TopbarSearch placeholder="Buscar..." />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <TopbarActions
          notificationCount={notificationCount}
          onNotifications={onNotifications}
          onHelp={onHelp}
          onShortcuts={onShortcuts}
        />

        <span className="hidden h-6 w-px bg-slate-200/80 md:block" aria-hidden="true" />

        <TopbarUserMenu
          name={userName}
          email={userEmail}
          role={userRole}
          avatarUrl={avatarUrl}
          onLogout={onLogout}
        />
      </div>
    </header>
  )
}
