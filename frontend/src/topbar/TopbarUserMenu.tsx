import { ChevronDown } from 'lucide-react'

interface TopbarUserMenuProps {
  name: string
  avatarUrl?: string
}

export function TopbarUserMenu({ name, avatarUrl }: TopbarUserMenuProps) {
  const initial = (name || 'U').charAt(0).toUpperCase()

  return (
    <button type="button" className="topbar-user" aria-label="Abrir menu do perfil">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="topbar-user-avatar" />
      ) : (
        <span className="topbar-user-avatar" aria-hidden="true">{initial}</span>
      )}
      <span className="topbar-user-name">{name}</span>
      <ChevronDown size={14} className="topbar-user-chevron" aria-hidden="true" />
    </button>
  )
}
