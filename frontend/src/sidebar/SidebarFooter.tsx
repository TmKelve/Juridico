import { LogOut } from 'lucide-react'
import { SidebarNavButton } from './SidebarNavItem'
import { cn } from '../lib/cn'

interface SidebarFooterProps {
  name: string
  role: string
  email: string
  isCollapsed: boolean
  onLogout: () => void
}

export function SidebarFooter({
  name,
  role,
  email,
  isCollapsed,
  onLogout,
}: SidebarFooterProps) {
  const initial = (email || name || 'L').charAt(0).toUpperCase()

  return (
    <footer className={cn('border-t border-slate-700/70 px-4 pb-5 pt-3', isCollapsed && 'md:px-3')}>
      {!isCollapsed && <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">PERFIL</p>}
      <div className={cn('mt-2 flex min-h-11 items-center gap-3 overflow-hidden px-2', isCollapsed && 'md:justify-center')} aria-label={`Usuário: ${role}`}>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-500/40 bg-slate-800 text-xs font-bold text-sky-200" aria-hidden="true">{initial}</span>
        <div className={cn('min-w-0 flex-1', isCollapsed && 'md:hidden')}>
          <span className="block truncate text-xs font-semibold text-slate-100">{role}</span>
          <span className="block truncate text-[11px] text-slate-400">{email}</span>
        </div>
      </div>
      <div className="mt-3 border-t border-slate-700/70 pt-2">
        <SidebarNavButton
          label="Encerrar"
          icon={LogOut}
          onClick={onLogout}
          variant="danger"
          isCollapsed={isCollapsed}
        />
      </div>
    </footer>
  )
}
