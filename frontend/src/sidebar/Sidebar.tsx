import './sidebar.css'
import { SidebarBrand } from './SidebarBrand'
import { SidebarNav } from './SidebarNav'
import { SidebarFooter } from './SidebarFooter'

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
  const cls = [
    'sidebar',
    isOpen ? 'is-open' : '',
    isCollapsed ? 'is-collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <aside className={cls} aria-label="Navegação principal">
        <div className="sidebar-body">
          <SidebarBrand isCollapsed={isCollapsed} />
          <SidebarNav role={user.role} onFetchUsers={onFetchUsers} />
        </div>

        <SidebarFooter
          name={user.email.split('@')[0]}
          role={roleLabel}
          email={user.email}
          onLogout={onLogout}
        />
      </aside>

      {isOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Fechar navegação"
          onClick={onCloseMobile}
        />
      )}
    </>
  )
}
