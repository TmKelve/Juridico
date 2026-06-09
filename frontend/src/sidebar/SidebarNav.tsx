import {
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FolderCog,
  Folder,
  Home,
  Landmark,
  PieChart,
  Scale,
  Settings,
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
        kind: 'link',
        label: 'Financeiro',
        icon: Landmark,
        to: '/financeiro',
        onClick: () => trackEvent('menu_financeiro_click'),
      },
    ],
  },
]

interface SidebarNavProps {
  role: string
  isCollapsed: boolean
  onFetchUsers: () => void
  onNavigate: () => void
}

export function SidebarNav({ role, isCollapsed, onFetchUsers, onNavigate }: SidebarNavProps) {
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

  if (role === 'platform_admin') {
    sections.push({
      title: 'PLATAFORMA',
      items: [
        { kind: 'link', label: 'Empresas', icon: Building2, to: '/platform-admin/empresas' },
        { kind: 'link', label: 'Colaboradores', icon: Users, to: '/platform-admin/colaboradores' },
        { kind: 'link', label: 'Auditoria', icon: ClipboardList, to: '/platform-admin/auditoria' },
      ],
    })
  }

  const supportSection: NavSection = {
    title: 'SUPORTE',
    items: [
      {
        kind: 'button',
        label: 'Ajuda',
        icon: CircleHelp,
        onClick: () => trackEvent('menu_help_click'),
      },
      {
        kind: 'button',
        label: 'Configurações',
        icon: Settings,
        onClick: () => trackEvent('menu_settings_click'),
      },
    ],
  }

  return (
    <nav className="flex flex-col gap-5" aria-label="Navegação principal">
      {[...sections, supportSection].map((section) => (
        <section className="flex flex-col gap-2" aria-label={section.title} key={section.title}>
          {!isCollapsed && <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{section.title}</p>}
          <div className="mt-1 flex flex-col gap-1">
            {section.items.map((item) =>
              item.kind === 'link' ? (
                <SidebarNavLink
                  key={item.label}
                  label={item.label}
                  icon={item.icon}
                  to={item.to}
                  onClick={item.onClick}
                  isCollapsed={isCollapsed}
                  onNavigate={onNavigate}
                />
              ) : (
                <SidebarNavButton
                  key={item.label}
                  label={item.label}
                  icon={item.icon}
                  onClick={item.onClick}
                  isCollapsed={isCollapsed}
                />
              )
            )}
          </div>
        </section>
      ))}
    </nav>
  )
}
