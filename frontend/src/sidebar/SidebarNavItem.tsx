import type { LucideIcon } from 'lucide-react'
import { NavLink, useLocation, matchPath } from 'react-router-dom'
import { cn } from '../lib/cn'

export interface SidebarNavLinkProps {
  label: string
  icon: LucideIcon
  to: string
  end?: boolean
  onClick?: () => void
  isCollapsed?: boolean
  onNavigate?: () => void
}

export interface SidebarNavButtonProps {
  label: string
  icon: LucideIcon
  onClick: () => void
  variant?: 'danger'
  isCollapsed?: boolean
}

export function SidebarNavLink({ label, icon: Icon, to, end, onClick, isCollapsed, onNavigate }: SidebarNavLinkProps) {
  const location = useLocation()
  const isActive = !!matchPath({ path: to, end: end ?? to === '/' }, location.pathname)

  return (
    <NavLink
      to={to}
      end={end ?? to === '/'}
      title={isCollapsed ? label : undefined}
      className={cn(
        'group relative flex h-10 w-full items-center gap-3 rounded-lg border border-transparent px-3 text-left text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-0',
        isCollapsed ? 'justify-center px-0 md:justify-center' : 'justify-start',
        isActive && 'border-slate-600/60 bg-slate-800 text-slate-50 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)]',
      )}
      aria-current={isActive ? 'page' : undefined}
      onClick={() => {
        onClick?.()
        onNavigate?.()
      }}
    >
      <span
        className={cn(
          'absolute inset-y-1 left-0 w-0.5 rounded-full bg-transparent transition-colors',
          isCollapsed && 'inset-x-1/2 inset-y-auto bottom-1 left-auto h-0.5 w-4 -translate-x-1/2',
          isActive && 'bg-sky-300',
        )}
        aria-hidden="true"
      />
      <span className={cn('inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors group-hover:text-slate-100', isActive && 'bg-slate-700 text-slate-100')} aria-hidden="true">
        <Icon size={18} strokeWidth={1.9} />
      </span>
      <span className={cn('truncate', isCollapsed && 'md:hidden')}>{label}</span>
    </NavLink>
  )
}

export function SidebarNavButton({ label, icon: Icon, onClick, variant, isCollapsed }: SidebarNavButtonProps) {
  return (
    <button
      type="button"
      title={isCollapsed ? label : undefined}
      className={cn(
        'group relative flex h-10 w-full items-center gap-3 rounded-lg border border-transparent px-3 text-left text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-0',
        isCollapsed ? 'justify-center px-0 md:justify-center' : 'justify-start',
        variant === 'danger' && 'text-rose-300 hover:bg-rose-900/30 hover:text-rose-200',
      )}
      onClick={onClick}
    >
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-current" aria-hidden="true">
        <Icon size={18} strokeWidth={1.9} />
      </span>
      <span className={cn('truncate', isCollapsed && 'md:hidden')}>{label}</span>
    </button>
  )
}
