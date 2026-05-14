import {
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  Folder,
  Home,
  Landmark,
  PieChart,
  Scale,
  Users,
} from 'lucide-react'
import { SidebarNavLink, SidebarNavButton } from './SidebarNavItem'
import type { SidebarNavLinkProps, SidebarNavButtonProps } from './SidebarNavItem'
import { trackEvent } from '../monitoring'

type NavLinkItem = SidebarNavLinkProps & { kind: 'link' }
type NavButtonItem = SidebarNavButtonProps & { kind: 'button' }
type NavItem = NavLinkItem | NavButtonItem

const mainNavItems: NavItem[] = [
  { kind: 'link',   label: 'Home',          icon: Home,        to: '/' },
  { kind: 'link',   label: 'Processos',     icon: Scale,       to: '/processos' },
  { kind: 'link',   label: 'Tarefas',       icon: ClipboardCheck, to: '/tarefas' },
  { kind: 'link',   label: 'Prazos',        icon: Clock3,      to: '/prazos' },
  { kind: 'link',   label: 'Documentos',    icon: Folder,      to: '/documentos' },
  { kind: 'link',   label: 'Modelos',       icon: BookOpen,    to: '/modelos-pecas' },
  { kind: 'link',   label: 'Publicações',   icon: Bell,        to: '/publicacoes-intimacoes' },
  { kind: 'link',   label: 'Atendimentos',  icon: Users,       to: '/atendimentos' },
  { kind: 'link',   label: 'Clientes',      icon: Briefcase,   to: '/clientes'     },
  { kind: 'link',   label: 'Agenda',        icon: CalendarDays, to: '/agenda' },
  { kind: 'button', label: 'Financeiro',    icon: Landmark,    onClick: () => trackEvent('menu_financeiro_click') },
  { kind: 'button', label: 'CRM Jurídico',  icon: PieChart,    onClick: () => trackEvent('menu_crm_click') },
]

interface SidebarNavProps {
  role: string
  onFetchUsers: () => void
}

export function SidebarNav({ role, onFetchUsers }: SidebarNavProps) {
  const navItems = mainNavItems.map((item) => {
    if (item.kind === 'link' && item.to === '/processos' && role === 'ADV') {
      return { ...item, label: 'Meus Processos' }
    }
    return item
  })

  return (
    <nav className="sidebar-nav shell-nav" aria-label="Navegação principal">
      {role === 'ADM' && (
        <SidebarNavLink label="Usuários" icon={Users} to="/usuarios" onClick={onFetchUsers} />
      )}
      {navItems.map((item) =>
        item.kind === 'link' ? (
          <SidebarNavLink key={item.label} label={item.label} icon={item.icon} to={item.to} />
        ) : (
          <SidebarNavButton key={item.label} label={item.label} icon={item.icon} onClick={item.onClick} />
        )
      )}
    </nav>
  )
}
