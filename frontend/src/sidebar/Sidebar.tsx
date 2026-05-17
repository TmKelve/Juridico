import { SidebarBrand } from './SidebarBrand'
import { SidebarNav } from './SidebarNav'
import { SidebarFooter } from './SidebarFooter'
import { cn } from '../lib/cn'

interface SidebarUser {
  email: string
  role: string
}

interface SidebarProps {
  user: SidebarUser
  roleLabel: string
  isOpen: boolean
  isCollapsed: boolean
  onLogout: () => void
  onFetchUsers: () => void
  onCloseMobile: () => void
}

export function Sidebar({
  user,
  roleLabel,
  isOpen,
  isCollapsed,
  onLogout,
  onFetchUsers,
  onCloseMobile,
}: SidebarProps) {
  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex h-dvh w-[18rem] -translate-x-full flex-col border-r border-slate-700/60 bg-slate-900 text-slate-100 shadow-2xl transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0',
          isOpen && 'translate-x-0',
          isCollapsed && 'md:w-[5.5rem]',
        )}
        aria-label="Navegação principal"
      >
        <div className={cn('flex min-h-0 flex-1 flex-col gap-2 px-4 pb-4 pt-6', isCollapsed && 'md:px-3')}>
          <SidebarBrand isCollapsed={isCollapsed} />
          <SidebarNav
            role={user.role}
            isCollapsed={isCollapsed}
            onFetchUsers={onFetchUsers}
            onNavigate={onCloseMobile}
          />
        </div>

        <SidebarFooter
          name={user.email.split('@')[0]}
          role={roleLabel}
          email={user.email}
          isCollapsed={isCollapsed}
          onLogout={onLogout}
        />
      </aside>

      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 border-none bg-slate-950/55 backdrop-blur-[1px] md:hidden"
          aria-label="Fechar navegação"
          onClick={onCloseMobile}
        />
      )}
    </>
  )
}
