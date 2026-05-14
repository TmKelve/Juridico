import type { LucideIcon } from 'lucide-react'
import { NavLink, useLocation, matchPath } from 'react-router-dom'

export interface SidebarNavLinkProps {
  label: string
  icon: LucideIcon
  to: string
  end?: boolean
  onClick?: () => void
}

export interface SidebarNavButtonProps {
  label: string
  icon: LucideIcon
  onClick: () => void
  variant?: 'danger'
}

export function SidebarNavLink({ label, icon: Icon, to, end, onClick }: SidebarNavLinkProps) {
  const location = useLocation()
  const isActive = !!matchPath({ path: to, end: end ?? to === '/' }, location.pathname)

  return (
    <NavLink
      to={to}
      end={end ?? to === '/'}
      className={`sidebar-nav-item shell-nav-item${isActive ? ' is-active active' : ''}`}
      aria-current={isActive ? 'page' : undefined}
      onClick={onClick}
    >
      <span className="sidebar-nav-icon" aria-hidden="true">
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <span className="sidebar-nav-label">{label}</span>
    </NavLink>
  )
}

export function SidebarNavButton({ label, icon: Icon, onClick, variant }: SidebarNavButtonProps) {
  return (
    <button
      type="button"
      className={`sidebar-nav-item shell-nav-item${variant === 'danger' ? ' is-danger' : ''}`}
      onClick={onClick}
    >
      <span className="sidebar-nav-icon" aria-hidden="true">
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <span className="sidebar-nav-label">{label}</span>
    </button>
  )
}
