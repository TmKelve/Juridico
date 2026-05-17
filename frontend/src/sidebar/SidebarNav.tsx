import {
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  FolderCog,
  Folder,
  Home,
  Landmark,
  PieChart,
  Scale,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { SidebarNavLink, SidebarNavButton } from './SidebarNavItem'
import type { SidebarNavLinkProps, SidebarNavButtonProps } from './SidebarNavItem'
import { trackEvent } from '../monitoring'

type NavLinkItem = SidebarNavLinkProps & { kind: 'link' }
type NavButtonItem = SidebarNavButtonProps & { kind: 'button' }
type NavItem = NavLinkItem | NavButtonItem

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'OPERAÇÃO',
    items: [
      { kind: 'link', label: 'Home', icon: Home, to: '/' },
      { kind: 'link', label: 'Processos', icon: Scale, to: '/processos' },
      { kind: 'link', label: 'Tarefas', icon: ClipboardCheck, to: '/tarefas' },
      { kind: 'link', label: 'Prazos', icon: Clock3, to: '/prazos' },
      { kind: 'link', label: 'Agenda', icon: CalendarDays, to: '/agenda' },
      { kind: 'link', label: 'Documentos', icon: Folder, to: '/documentos' },
      { kind: 'link', label: 'Modelos', icon: BookOpen, to: '/modelos-pecas' },
      { kind: 'link', label: 'Publicações', icon: Bell, to: '/publicacoes-intimacoes' },
      { kind: 'link', label: 'Triagem', icon: ShieldAlert, to: '/triagem' },
      { kind: 'link', label: 'Atendimentos', icon: Users, to: '/atendimentos' },
    ],
  },
  {
    title: 'CRM',
    items: [
      { kind: 'link', label: 'Clientes', icon: Briefcase, to: '/clientes' },
      { kind: 'link', label: 'CRM Jurídico', icon: PieChart, to: '/crm-juridico' },
    ],
  },
  {
    title: 'GESTÃO',
    items: [
      {
        kind: 'button',
        label: 'Financeiro',
        icon: Landmark,
        onClick: () => trackEvent('menu_financeiro_click'),
      },
    ],
  },
]

interface SidebarNavProps {
  role: string
  isCollapsed: boolean
  onFetchUsers: () => void
}

export function SidebarNav({ role, isCollapsed, onFetchUsers }: SidebarNavProps) {
  const sections = navSections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if (item.kind === 'link' && item.to === '/processos' && role === 'ADV') {
        return { ...item, label: 'Meus Processos' }
      }

      return item
    }),
  }))

  if (role === 'ADM') {
    const managementSection = sections.find((section) => section.title === 'GESTÃO')
    managementSection?.items.unshift({
      kind: 'link',
      label: 'Usuários',
      icon: FolderCog,
      to: '/usuarios',
      onClick: onFetchUsers,
    })
  }

  return (
    <nav className="sidebar-nav shell-nav" aria-label="Navegação principal">
      {sections.map((section) => (
        <section className="sidebar-nav-section" aria-label={section.title} key={section.title}>
          {!isCollapsed && <p className="sidebar-nav-heading">{section.title}</p>}
          <div className="sidebar-nav-group">
            {section.items.map((item) =>
              item.kind === 'link' ? (
                <SidebarNavLink
                  key={item.label}
                  label={item.label}
                  icon={item.icon}
                  to={item.to}
                  onClick={item.onClick}
                />
              ) : (
                <SidebarNavButton
                  key={item.label}
                  label={item.label}
                  icon={item.icon}
                  onClick={item.onClick}
                />
              )
            )}
          </div>
        </section>
      ))}
    </nav>
  )
}
