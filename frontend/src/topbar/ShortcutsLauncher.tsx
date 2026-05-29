import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Briefcase,
  Clock,
  CalendarDays,
  FileText,
  CheckSquare,
  MessageSquare,
  Users,
  Newspaper,
  Wallet,
} from 'lucide-react'

interface Shortcut {
  label: string
  href: string
  icon: React.ElementType
}

const SHORTCUTS: Shortcut[] = [
  { label: 'Meu Dia', href: '/', icon: LayoutDashboard },
  { label: 'Processos', href: '/processos', icon: Briefcase },
  { label: 'Prazos', href: '/prazos', icon: Clock },
  { label: 'Agenda', href: '/agenda', icon: CalendarDays },
  { label: 'Clientes', href: '/clientes', icon: Users },
  { label: 'Documentos', href: '/documentos', icon: FileText },
  { label: 'Tarefas', href: '/tarefas', icon: CheckSquare },
  { label: 'Atendimentos', href: '/atendimentos', icon: MessageSquare },
  { label: 'Publicações', href: '/publicacoes-intimacoes', icon: Newspaper },
  { label: 'Financeiro', href: '/financeiro', icon: Wallet },
]

interface Props {
  onClose: () => void
}

export function ShortcutsLauncher({ onClose }: Props) {
  const navigate = useNavigate()

  const handleClick = (href: string) => {
    onClose()
    navigate(href)
  }

  return (
    <div className="shortcuts-launcher" role="dialog" aria-label="Atalhos de navegação">
      <p className="shortcuts-launcher-title">Atalhos</p>
      <div className="shortcuts-grid">
        {SHORTCUTS.map((s) => {
          const Icon = s.icon
          return (
            <button
              key={s.href}
              type="button"
              className="shortcut-item"
              onClick={() => handleClick(s.href)}
            >
              <span className="shortcut-icon">
                <Icon size={18} strokeWidth={1.5} />
              </span>
              <span className="shortcut-label">{s.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
