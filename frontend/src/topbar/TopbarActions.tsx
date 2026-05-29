import { useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Bell, CircleHelp, LayoutGrid } from 'lucide-react'
import { NotificationsDropdown } from './NotificationsDropdown'
import { ShortcutsLauncher } from './ShortcutsLauncher'

interface TopbarIconBtnProps {
  icon: LucideIcon
  label: string
  badge?: number
  active?: boolean
  onClick?: () => void
  className?: string
}

function TopbarIconBtn({ icon: Icon, label, badge, active, onClick, className }: TopbarIconBtnProps) {
  return (
    <button
      type="button"
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-md border-none p-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
        active
          ? 'bg-slate-100 text-slate-900'
          : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      } ${className || ''}`}
      aria-label={label}
      aria-expanded={active}
      onClick={onClick}
    >
      <Icon size={18} strokeWidth={1.75} />
      {badge != null && badge > 0 && (
        <span
          className="pointer-events-none absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-rose-600 px-1 text-[10px] font-bold leading-none text-white"
          aria-label={`${badge} notificações`}
        >
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  )
}

type OpenPanel = 'notifications' | 'shortcuts' | null

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
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
  const [liveNotifCount, setLiveNotifCount] = useState(notificationCount)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openPanel) return
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpenPanel(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openPanel])

  useEffect(() => {
    if (!openPanel) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPanel(null)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [openPanel])

  const toggle = (panel: OpenPanel, callback?: () => void) => {
    setOpenPanel((prev) => (prev === panel ? null : panel))
    callback?.()
  }

  return (
    <div ref={containerRef} className="flex items-center gap-0.5">
      {/* Bell — notifications */}
      <div className="relative">
        <TopbarIconBtn
          icon={Bell}
          label="Abrir notificações"
          badge={liveNotifCount}
          active={openPanel === 'notifications'}
          onClick={() => toggle('notifications', onNotifications)}
        />
        {openPanel === 'notifications' && (
          <NotificationsDropdown
            onClose={() => setOpenPanel(null)}
            onCountChange={setLiveNotifCount}
          />
        )}
      </div>

      {/* Grid — shortcuts */}
      <div className="relative hidden md:block">
        <TopbarIconBtn
          icon={LayoutGrid}
          label="Abrir atalhos"
          active={openPanel === 'shortcuts'}
          onClick={() => toggle('shortcuts', onShortcuts)}
          className="inline-flex"
        />
        {openPanel === 'shortcuts' && (
          <ShortcutsLauncher onClose={() => setOpenPanel(null)} />
        )}
      </div>

      {/* Help */}
      <TopbarIconBtn
        icon={CircleHelp}
        label="Abrir ajuda"
        onClick={onHelp}
        className="hidden md:inline-flex"
      />
    </div>
  )
}
