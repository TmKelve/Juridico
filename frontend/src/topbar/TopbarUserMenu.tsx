import { ChevronDown } from 'lucide-react'

interface TopbarUserMenuProps {
  name: string
  avatarUrl?: string
}

export function TopbarUserMenu({ name, avatarUrl }: TopbarUserMenuProps) {
  const initial = (name || 'U').charAt(0).toUpperCase()

  return (
    <button type="button" className="inline-flex items-center gap-2 rounded-full border-none bg-transparent px-1 py-1 pr-2 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" aria-label="Abrir menu do perfil">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-slate-100" />
      ) : (
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-700 to-slate-800 text-sm font-bold text-white" aria-hidden="true">{initial}</span>
      )}
      <span className="hidden max-w-36 truncate text-sm font-medium lowercase text-slate-700 md:block">{name}</span>
      <ChevronDown size={14} className="hidden shrink-0 text-slate-400 md:block" aria-hidden="true" />
    </button>
  )
}
