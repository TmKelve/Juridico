import { LogOut, Settings } from 'lucide-react'
import { SidebarNavButton } from './SidebarNavItem'
import { trackEvent } from '../monitoring'

interface SidebarFooterProps {
  name: string
  role: string
  email: string
  onLogout: () => void
}

export function SidebarFooter({ name, role, email, onLogout }: SidebarFooterProps) {
  const initial = (email || name || 'L').charAt(0).toUpperCase()

  return (
    <footer className="sidebar-footer">
      <div className="sidebar-secondary-nav">
        <SidebarNavButton
          label="Configurações"
          icon={Settings}
          onClick={() => trackEvent('menu_settings_click')}
        />
        <SidebarNavButton
          label="Encerrar"
          icon={LogOut}
          onClick={onLogout}
          variant="danger"
        />
      </div>

      <div className="sidebar-user" aria-label={`Usuário: ${role}`}>
        <span className="sidebar-user-avatar" aria-hidden="true">{initial}</span>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{role}</span>
          <span className="sidebar-user-email">{email}</span>
        </div>
      </div>
    </footer>
  )
}
