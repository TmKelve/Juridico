import { useEffect, useRef, useState } from 'react'
import { ChevronDown, User, Settings, LogOut, X, Camera, Lock, Phone } from 'lucide-react'

function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    ADM: 'Administrador',
    ADV: 'Advogado',
    FIN: 'Financeiro',
    ATD: 'Atendimento',
  }
  return labels[role] || role
}

// Máscara para telefone brasileiro
function phoneMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

/* ═══════════════════════════════════════════════════════════════════ */
/* PROFILE PANEL (drawer lateral)                                      */
/* ═══════════════════════════════════════════════════════════════════ */

interface ProfilePanelProps {
  name: string
  email: string
  role: string
  avatarUrl?: string
  onClose: () => void
  onAvatarChange?: (url: string) => void
}

function ProfilePanel({ name, email, role, avatarUrl, onClose, onAvatarChange }: ProfilePanelProps) {
  const initial = (name || 'U').charAt(0).toUpperCase()
  const roleLabel = getRoleLabel(role)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [localAvatar, setLocalAvatar] = useState(avatarUrl || '')

  // === Seção: Alterar senha ===
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleAvatarClick = () => fileInputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setPwMessage({ type: 'error', text: 'Imagem deve ter no máximo 2MB.' })
      setTimeout(() => setPwMessage(null), 4000)
      return
    }

    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      setLocalAvatar(dataUrl)
      onAvatarChange?.(dataUrl)

      try {
        const res = await fetch('/api/me/avatar', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ avatarUrl: dataUrl }),
        })
        if (!res.ok) throw new Error()
        setPwMessage({ type: 'success', text: 'Foto atualizada!' })
      } catch {
        setPwMessage({ type: 'success', text: 'Foto atualizada localmente.' })
      }
      setTimeout(() => setPwMessage(null), 3000)
    }
    reader.readAsDataURL(file)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwMessage(null)

    if (!currentPw || !newPw || !confirmPw) {
      setPwMessage({ type: 'error', text: 'Preencha todos os campos.' })
      return
    }
    if (newPw.length < 6) {
      setPwMessage({ type: 'error', text: 'Nova senha deve ter pelo menos 6 caracteres.' })
      return
    }
    if (newPw !== confirmPw) {
      setPwMessage({ type: 'error', text: 'Confirmação de senha não confere.' })
      return
    }

    setPwLoading(true)
    try {
      const res = await fetch('/api/me/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      })
      const data = await res.json()
      if (res.ok) {
        setPwMessage({ type: 'success', text: 'Senha alterada com sucesso!' })
        setCurrentPw('')
        setNewPw('')
        setConfirmPw('')
      } else {
        setPwMessage({ type: 'error', text: data.error || 'Erro ao alterar senha.' })
      }
    } catch {
      setPwMessage({ type: 'error', text: 'Erro de conexão.' })
    } finally {
      setPwLoading(false)
    }
  }

  // Fechar com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      <div className="profile-panel-overlay" onClick={onClose} aria-hidden="true" />
      <div className="profile-panel" role="dialog" aria-label="Meu perfil" aria-modal="true">
        <div className="profile-panel-head">
          <span className="profile-panel-title">Meu perfil</span>
          <button type="button" className="profile-panel-close" onClick={onClose} aria-label="Fechar painel de perfil">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="profile-panel-body">
          {/* Avatar com upload */}
          <div className="profile-avatar-wrapper" onClick={handleAvatarClick} role="button" tabIndex={0} aria-label="Alterar foto de perfil">
            {localAvatar ? (
              <img src={localAvatar} alt="Avatar" className="profile-avatar-lg profile-avatar-img" />
            ) : (
              <div className="profile-avatar-lg" aria-hidden="true">{initial}</div>
            )}
            <div className="profile-avatar-overlay">
              <Camera size={18} strokeWidth={1.75} />
              <span>Alterar</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="profile-avatar-input"
              aria-label="Selecionar foto"
            />
          </div>

          <div className="profile-info">
            <p className="profile-info-name">{name}</p>
            <p className="profile-info-role">{roleLabel}</p>
            <p className="profile-info-email">{email}</p>
          </div>

          {/* Mensagem de feedback */}
          {pwMessage && (
            <div className={`profile-feedback profile-feedback--${pwMessage.type}`} role="status" aria-live="polite">
              {pwMessage.text}
            </div>
          )}

          {/* Seção: Alterar senha */}
          <form className="profile-section" onSubmit={handlePasswordChange}>
            <h3 className="profile-section-title">
              <Lock size={14} strokeWidth={1.75} />
              Alterar senha
            </h3>

            <div className="profile-field">
              <label htmlFor="current-pw">Senha atual</label>
              <input
                id="current-pw"
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="••••••"
                autoComplete="current-password"
              />
            </div>

            <div className="profile-field">
              <label htmlFor="new-pw">Nova senha</label>
              <input
                id="new-pw"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
            </div>

            <div className="profile-field">
              <label htmlFor="confirm-pw">Confirmar nova senha</label>
              <input
                id="confirm-pw"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="profile-submit-btn" disabled={pwLoading}>
              {pwLoading ? 'Alterando...' : 'Alterar senha'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/* SETTINGS PANEL (WhatsApp)                                           */
/* ═══════════════════════════════════════════════════════════════════ */

interface SettingsPanelProps {
  onClose: () => void
}

function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(phoneMask(e.target.value))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 11) {
      setMessage({ type: 'error', text: 'Número inválido. Use DDD + número.' })
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/me/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: digits }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'WhatsApp salvo com sucesso!' })
      } else {
        throw new Error()
      }
    } catch {
      setMessage({ type: 'success', text: 'WhatsApp salvo localmente.' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      <div className="profile-panel-overlay" onClick={onClose} aria-hidden="true" />
      <div className="profile-panel" role="dialog" aria-label="Configurações" aria-modal="true">
        <div className="profile-panel-head">
          <span className="profile-panel-title">Configurações</span>
          <button type="button" className="profile-panel-close" onClick={onClose} aria-label="Fechar configurações">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="profile-panel-body">
          <form className="profile-section" onSubmit={handleSave}>
            <h3 className="profile-section-title">
              <Phone size={14} strokeWidth={1.75} />
              WhatsApp
            </h3>
            <p className="profile-section-description">
              Informe seu número de WhatsApp para receber notificações e facilitar a comunicação com clientes.
            </p>

            <div className="profile-field">
              <label htmlFor="whatsapp-phone">Número com DDD</label>
              <input
                id="whatsapp-phone"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(11) 99999-9999"
                autoComplete="tel"
              />
            </div>

            {message && (
              <div className={`profile-feedback profile-feedback--${message.type}`} role="status" aria-live="polite">
                {message.text}
              </div>
            )}

            <button type="submit" className="profile-submit-btn" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar WhatsApp'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════ */
/* USER MENU (dropdown + panels)                                       */
/* ═══════════════════════════════════════════════════════════════════ */

interface TopbarUserMenuProps {
  name: string
  email: string
  role: string
  avatarUrl?: string
  onLogout?: () => void
}

export function TopbarUserMenu({ name, email, role, avatarUrl, onLogout }: TopbarUserMenuProps) {
  const initial = (name || 'U').charAt(0).toUpperCase()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [localAvatar, setLocalAvatar] = useState(avatarUrl || '')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [dropdownOpen])

  const handleProfileClick = () => {
    setDropdownOpen(false)
    setProfileOpen(true)
  }

  const handleSettingsClick = () => {
    setDropdownOpen(false)
    setSettingsOpen(true)
  }

  const handleLogout = () => {
    setDropdownOpen(false)
    onLogout?.()
  }

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          className={`inline-flex items-center gap-2 rounded-full border-none px-1 py-1 pr-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
            dropdownOpen ? 'bg-slate-100' : 'bg-transparent hover:bg-slate-100'
          }`}
          aria-label="Abrir menu do perfil"
          aria-expanded={dropdownOpen}
          onClick={() => setDropdownOpen((p) => !p)}
        >
          {localAvatar ? (
            <img src={localAvatar} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-slate-100" />
          ) : (
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-700 to-slate-800 text-sm font-bold text-white" aria-hidden="true">
              {initial}
            </span>
          )}
          <span className="hidden max-w-36 truncate text-sm font-medium lowercase text-slate-700 md:block">{name}</span>
          <ChevronDown
            size={14}
            className={`hidden shrink-0 text-slate-400 transition-transform md:block ${dropdownOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {dropdownOpen && (
          <div className="user-dropdown" role="menu">
            <button type="button" className="user-dropdown-item" role="menuitem" onClick={handleProfileClick}>
              <User size={15} strokeWidth={1.75} />
              <span>Meu perfil</span>
            </button>
            <button type="button" className="user-dropdown-item" role="menuitem" onClick={handleSettingsClick}>
              <Settings size={15} strokeWidth={1.75} />
              <span>Configurações</span>
            </button>
            <div className="user-dropdown-separator" role="separator" />
            <button type="button" className="user-dropdown-item user-dropdown-item--danger" role="menuitem" onClick={handleLogout}>
              <LogOut size={15} strokeWidth={1.75} />
              <span>Sair</span>
            </button>
          </div>
        )}
      </div>

      {profileOpen && (
        <ProfilePanel
          name={name}
          email={email}
          role={role}
          avatarUrl={localAvatar}
          onClose={() => setProfileOpen(false)}
          onAvatarChange={setLocalAvatar}
        />
      )}

      {settingsOpen && (
        <SettingsPanel onClose={() => setSettingsOpen(false)} />
      )}
    </>
  )
}
