import { useEffect, useEffectEvent, useState } from 'react'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { api } from './api'
import { initMonitoring, trackAuthEvent, trackPageView, trackEvent } from './monitoring'
import { Atendimentos } from './Atendimentos'
import { Agenda } from './Agenda'
import { Clients } from './Clients'
import { CrmJuridico } from './CrmJuridico'
import { Deadlines } from './Deadlines'
import { Documents } from './Documents'
import { PieceTemplates } from './PieceTemplates'
import { Publications } from './Publications'
import { Processes } from './Processes'
import { ProcessDetail } from './ProcessDetail'
import { Tasks } from './Tasks'
import { Triagem } from './Triagem'
import { Dashboard } from './Dashboard'
import { Sidebar } from './sidebar/Sidebar'
import { Topbar } from './topbar/Topbar'
import './tokens.css'
import './App.css'

// Initialize monitoring on app load
initMonitoring()

type User = { id: number; email: string; role: string }
type HomePayload = { profile: string; home: { menu: string[]; cards: string[] } }

function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    ADM: 'Coordenador Jurídico',
    ADV: 'Advogado',
    FIN: 'Financeiro',
    ATD: 'Atendimento',
  }

  return labels[role] || role
}

function getPageMeta(pathname: string, role: string) {
  if (pathname.startsWith('/processos/')) {
    return {
      title: 'Detalhe do Processo',
      subtitle: 'Central operacional do caso com timeline, pendencias e acoes rapidas.',
      badge: 'Operação',
    }
  }

  if (pathname === '/processos') {
    if (role === 'ADV') {
      return {
        title: 'Meus Processos',
        subtitle: 'Acompanhe sua carteira, priorize urgências e mantenha cada caso em movimento.',
        badge: 'Operação',
      }
    }

    return {
      title: 'Processos',
      subtitle: 'Gestão operacional de processos, responsáveis e status.',
      badge: 'Operação',
    }
  }

  if (pathname === '/prazos') {
    return {
      title: 'Prazos',
      subtitle: 'Controle prazos, priorize urgencias e conclua pendencias com velocidade.',
      badge: 'Operação',
    }
  }

  if (pathname === '/agenda') {
    return {
      title: 'Agenda',
      subtitle: 'Visão temporal consolidada de compromissos, audiencias, prazos e retornos com foco operacional.',
      badge: 'Operação',
    }
  }

  if (pathname === '/documentos') {
    return {
      title: 'Documentos',
      subtitle: 'Gerencie documentos da carteira, valide versoes e elimine faltantes com rastreabilidade.',
      badge: 'Operação',
    }
  }

  if (pathname === '/atendimentos') {
    return {
      title: 'Atendimentos',
      subtitle: 'Registre interações, acompanhe retornos e mantenha cada vínculo cliente–processo atualizado.',
      badge: 'Operação',
    }
  }

  if (pathname === '/clientes') {
    return {
      title: 'Clientes',
      subtitle: 'Gerencie sua carteira, acompanhe pendências e mantenha o vínculo cliente–processo sempre atualizado.',
      badge: 'Operação',
    }
  }

  if (pathname === '/publicacoes-intimacoes') {
    return {
      title: 'Publicações e Intimações',
      subtitle: 'Monitore novas publicações, identifique impacto e transforme intimações em ação jurídica com rastreabilidade.',
      badge: 'Operação',
    }
  }

  if (pathname === '/triagem') {
    return {
      title: 'Triagem',
      subtitle: 'Centralize capturas automatizadas, confirme ações sugeridas e preserve auditoria da automação jurídica.',
      badge: 'Automação',
    }
  }

  if (pathname === '/crm-juridico') {
    return {
      title: 'CRM Jurídico',
      subtitle: 'Acompanhe leads, oportunidades derivadas da triagem e conduza o relacionamento comercial com contexto jurídico.',
      badge: 'Relacionamento',
    }
  }

  if (pathname === '/modelos-pecas') {
    return {
      title: 'Modelos de Peças',
      subtitle: 'Encontre modelos oficiais, versione conteúdo e gere novas peças com autopreenchimento contextual.',
      badge: 'Produtividade',
    }
  }

  if (pathname === '/tarefas') {
    return {
      title: 'Tarefas',
      subtitle: 'Priorize entregas críticas, conclua ações operacionais e acompanhe delegações com rastreabilidade.',
      badge: 'Operação',
    }
  }

  if (pathname === '/usuarios') {
    return {
      title: 'Usuários',
      subtitle: 'Visão administrativa de acessos e perfis do escritório.',
      badge: 'Administração',
    }
  }

  return {
    title: 'Meu Dia',
    subtitle: `Priorize prazos críticos, avance tarefas-chave e monitore gargalos da operação (${getRoleLabel(role).toLowerCase()}).`,
    badge: 'Dashboard',
  }
}

function UsersList({ users, onRefresh }: { users: User[]; onRefresh: () => Promise<void> }) {
  const handleRefresh = useEffectEvent(() => {
    void onRefresh()
  })

  useEffect(() => {
    handleRefresh()
  }, [])

  return (
    <div className="page-content">
      <h2>Usuários</h2>
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Email</th>
            <th>Perfil</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && <p>Nenhum usuário disponível.</p>}
    </div>
  )
}

function AppShell({
  user,
  users,
  error,
  fetchHome,
  fetchUsers,
  onLogout,
}: {
  user: User
  users: User[]
  error: string
  fetchHome: () => Promise<void>
  fetchUsers: () => Promise<void>
  onLogout: () => void
}) {
  const location = useLocation()
  const pageMeta = getPageMeta(location.pathname, user.role)
  const isDashboard = location.pathname === '/'
  const isCrmJuridico = location.pathname === '/crm-juridico'
  const shortName = (user.email || getRoleLabel(user.role)).split('@')[0].slice(0, 12)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const loadUsersOnRoute = useEffectEvent(() => {
    if (location.pathname === '/usuarios' && user.role === 'ADM') {
      void fetchUsers()
    }
  })

  useEffect(() => {
    loadUsersOnRoute()
  }, [location.pathname, user.role])

  const handleNavToggle = () => {
    const viewport = window.innerWidth
    if (viewport < 768) {
      setSidebarOpen((prev) => !prev)
      return
    }

    setSidebarCollapsed((prev) => !prev)
  }

  return (
    <div className={`app-shell${sidebarCollapsed ? ' sidebar-is-collapsed' : ''}`}>
      <Sidebar
        user={user}
        roleLabel={getRoleLabel(user.role)}
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onLogout={onLogout}
        onFetchUsers={fetchUsers}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      <main className="shell-main">
        <Topbar
          userName={shortName}
          notificationCount={3}
          onMenuClick={handleNavToggle}
          onNotifications={() => trackEvent('notifications_opened')}
          onHelp={() => trackEvent('help_opened')}
          onShortcuts={() => trackEvent('shortcuts_opened')}
        />

        {!isCrmJuridico ? (
          <header className="page-header-shell">
            <div>
              <div className="page-header-badge">{pageMeta.badge}</div>
              <h1>{pageMeta.title}</h1>
              <p>{pageMeta.subtitle}</p>
            </div>

            <div className="page-header-actions">
              {isDashboard ? (
                <>
                  <button className="btn-primary" onClick={() => trackEvent('header_new_task_click')}>Nova Tarefa</button>
                  <button className="btn-secondary" onClick={() => trackEvent('header_view_agenda_click')}>Ver Agenda</button>
                </>
              ) : (
                <button className="btn-primary" onClick={() => fetchHome()}>Atualizar dados</button>
              )}
            </div>
          </header>
        ) : null}

        {error && <p className="error">{error}</p>}

        <section className="shell-content-canvas">
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/processos" element={<Processes user={user} />} />
            <Route path="/processos/:id" element={<ProcessDetail user={user} />} />
            <Route path="/prazos" element={<Deadlines user={user} />} />
            <Route path="/agenda" element={<Agenda user={user} />} />
            <Route path="/documentos" element={<Documents user={user} />} />
            <Route path="/modelos-pecas" element={<PieceTemplates user={user} />} />
            <Route path="/tarefas" element={<Tasks user={user} />} />
            <Route path="/atendimentos" element={<Atendimentos user={user} />} />
            <Route path="/clientes" element={<Clients user={user} />} />
            <Route path="/crm-juridico" element={<CrmJuridico user={user} />} />
            <Route path="/publicacoes-intimacoes" element={<Publications user={user} />} />
            <Route path="/triagem" element={<Triagem user={user} />} />
            <Route
              path="/usuarios"
              element={user.role === 'ADM' ? <UsersList users={users} onRefresh={fetchUsers} /> : <Navigate to="/" replace />}
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </section>
      </main>
    </div>
  )
}

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [home, setHome] = useState<HomePayload | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    trackPageView('app')
    restoreSession(true)
  }, [])

  // Track dashboard view
  useEffect(() => {
    if (user && home) {
      trackPageView('dashboard', { role: user.role })
    }
  }, [user, home])

  const fetchHome = async (userOverride?: User | null, silent = false) => {
    try {
      const res = await api.getHome()
      if (res.status === 200) {
        setHome(res.data)
        setUser((prev) => {
          const resolvedUser = userOverride ?? prev
          if (!resolvedUser) return { id: 0, email: '', role: res.data.profile }
          return { ...resolvedUser, role: res.data.profile }
        })
        setError('')
      } else {
        throw new Error(res.error || 'Erro ao carregar home')
      }
    } catch (err) {
      if (silent) {
        setHome(null)
        setUser(null)
        return
      }
      const errorMsg = 'Sessão expirada, faça login novamente.'
      setError(errorMsg)
      setHome(null)
      setUser(null)
      trackEvent('session_expired', { error: (err as Error).message })
    }
  }

  const restoreSession = async (silent = false) => {
    try {
      const [meRes, homeRes] = await Promise.all([api.getMe(), api.getHome()])

      if (meRes.status === 200 && homeRes.status === 200) {
        const meUser = meRes.data.user || {}
        const restoredUser: User = {
          id: Number(meUser.id ?? meUser.sub ?? 0),
          email: String(meUser.email || ''),
          role: String(meUser.role || homeRes.data.profile || ''),
        }

        setUser(restoredUser)
        setHome(homeRes.data)
        setError('')
        return
      }

      throw new Error(meRes.error || homeRes.error || 'Erro ao restaurar sessão')
    } catch (err) {
      if (silent) {
        setHome(null)
        setUser(null)
        return
      }
      const errorMsg = 'Sessão expirada, faça login novamente.'
      setError(errorMsg)
      setHome(null)
      setUser(null)
      trackEvent('session_expired', { error: (err as Error).message })
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await api.getUsers()
      if (res.status === 200) {
        setUsers(res.data)
        setError('')
        trackEvent('users_loaded', { count: res.data.length })
      } else if (res.status === 403) {
        setUsers([])
        setError('Apenas ADM pode ver usuários')
        trackEvent('users_access_denied')
      } else {
        setUsers([])
        setError(res.error || 'Erro ao carregar usuários')
      }
    } catch (err) {
      const errorMsg = 'Erro ao carregar usuários'
      setUsers([])
      setError(errorMsg)
      trackEvent('users_error', { error: (err as Error).message })
    }
  }

  const login = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const res = await api.login(email, password)
      if (res.status === 200) {
        setUser(res.data.user)
        trackAuthEvent('success', { role: res.data.user.role, email })
        await fetchHome(res.data.user)
      } else {
        const errorMsg = res.error || 'Email ou senha incorretos'
        setError(errorMsg)
        trackAuthEvent('failure', { reason: 'invalid_credentials', email })
      }
    } catch (err) {
      const errorMsg = 'Erro de conexão com backend'
      setError(errorMsg)
      trackAuthEvent('failure', { reason: 'network_error', error: (err as Error).message })
    } finally {
      setIsLoading(false)
    }
  }

  if (!user || !home) {
    return (
      <div className="auth-screen">
        <video
          className="auth-background-video"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        >
          <source src="/fundo_login.mp4" type="video/mp4" />
        </video>
        <div className="auth-background-overlay" aria-hidden="true" />
        <div className="auth-panel">
          <div className="auth-header">
            <img src="/lexora-logo.svg" alt="Lexora" className="logo" />
          </div>

          <form onSubmit={login} className="auth-form" noValidate>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                required
                disabled={isLoading}
                aria-required="true"
                aria-describedby={error ? 'auth-error' : undefined}
                aria-invalid={error ? 'true' : 'false'}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                placeholder="••••••"
                required
                disabled={isLoading}
                aria-required="true"
                aria-describedby={error ? 'auth-error' : undefined}
                aria-invalid={error ? 'true' : 'false'}
              />
            </div>

            {error && (
              <div className="error-container" id="auth-error" role="alert" aria-live="assertive">
                <span className="error-icon" aria-hidden="true">
                  <AlertTriangle size={18} />
                </span>
                <span className="error-message">{error}</span>
              </div>
            )}

            <button
              className="btn-primary"
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <details className="credentials-helper">
            <summary>Precisa de credenciais para teste?</summary>
            <div className="credentials-list">
              <p><strong>Administrador:</strong> admin@juridico.com / 123456</p>
              <p><strong>Advogado:</strong> advogado@juridico.com / 123456</p>
              <p><strong>Financeiro:</strong> financeiro@juridico.com / 123456</p>
            </div>
          </details>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <AppShell
        user={user}
        users={users}
        error={error}
        fetchHome={fetchHome}
        fetchUsers={fetchUsers}
        onLogout={async () => {
          trackEvent('logout', { role: user.role })
          await api.logout()
          setUser(null)
          setHome(null)
          setUsers([])
        }}
      />
    </Router>
  )
}

export default App
