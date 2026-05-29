import { useEffect, useState } from 'react'
import { Bell, Briefcase, Clock, CheckSquare, MessageSquare, Cog, X, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

interface Notification {
  id: number
  type: string
  title: string
  body: string
  href: string
  read: boolean
  createdAt: string
}

const TYPE_ICON: Record<string, React.ElementType> = {
  prazo_vencendo: Clock,
  publicacao_nova: Briefcase,
  tarefa_pendente: CheckSquare,
  atendimento_retorno: MessageSquare,
  sistema: Cog,
}

const TYPE_COLOR: Record<string, string> = {
  prazo_vencendo: 'notif-icon--prazo',
  publicacao_nova: 'notif-icon--publicacao',
  tarefa_pendente: 'notif-icon--tarefa',
  atendimento_retorno: 'notif-icon--atendimento',
  sistema: 'notif-icon--sistema',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.floor(hours / 24)
  return `há ${days} d`
}

interface Props {
  onClose: () => void
  onCountChange?: (count: number) => void
}

export function NotificationsDropdown({ onClose, onCountChange }: Props) {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchNotifications() {
      try {
        const res = await api.getNotifications()
        if (!cancelled && res.status === 200) {
          setNotifications(res.data.notifications || [])
        }
      } catch {
        // Se a API falhar, mantém vazio
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchNotifications()
    return () => { cancelled = true }
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    onCountChange?.(unreadCount)
  }, [unreadCount, onCountChange])

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await api.markAllNotificationsRead()
    } catch { /* silently fail */ }
  }

  const markRead = async (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    try {
      await api.markNotificationRead(id)
    } catch { /* silently fail */ }
  }

  const handleClick = (notif: Notification) => {
    markRead(notif.id)
    onClose()
    navigate(notif.href)
  }

  return (
    <div className="notif-dropdown" role="dialog" aria-label="Notificações">
      <div className="notif-dropdown-head">
        <div className="notif-dropdown-title">
          <Bell size={15} strokeWidth={1.75} />
          <span>Notificações</span>
          {unreadCount > 0 && (
            <span className="notif-count-chip">{unreadCount}</span>
          )}
        </div>
        <div className="notif-dropdown-head-actions">
          {unreadCount > 0 && (
            <button type="button" className="notif-mark-all-btn" onClick={markAllRead}>
              Marcar todas como lidas
            </button>
          )}
          <button type="button" className="notif-close-btn" onClick={onClose} aria-label="Fechar notificações">
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      </div>

      <ul className="notif-list" role="list">
        {loading && (
          <li className="notif-loading" role="status" aria-live="polite">
            <Loader2 size={20} className="spin" />
            <span>Carregando...</span>
          </li>
        )}

        {!loading && notifications.length === 0 && (
          <li className="notif-empty">
            <Bell size={32} strokeWidth={1.25} />
            <span>Nenhuma notificação.</span>
          </li>
        )}

        {!loading && notifications.map((notif) => {
          const Icon = TYPE_ICON[notif.type] || Bell
          const colorClass = TYPE_COLOR[notif.type] || 'notif-icon--sistema'
          return (
            <li key={notif.id} className={`notif-item${notif.read ? ' notif-item--read' : ''}`}>
              <button
                type="button"
                className="notif-item-btn"
                onClick={() => handleClick(notif)}
              >
                <span className={`notif-icon ${colorClass}`}>
                  <Icon size={14} strokeWidth={1.75} />
                </span>
                <span className="notif-content">
                  <span className="notif-item-title">{notif.title}</span>
                  <span className="notif-item-body">{notif.body}</span>
                  <span className="notif-item-time">{timeAgo(notif.createdAt)}</span>
                </span>
                {!notif.read && <span className="notif-unread-dot" aria-label="Não lida" />}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
