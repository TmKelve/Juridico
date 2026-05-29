import { Suspense, lazy, useEffect, useEffectEvent, useRef, useState } from 'react'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { api } from './api'
import { initMonitoring, trackAuthEvent, trackPageView, trackEvent } from './monitoring'
import { Sidebar } from './sidebar/Sidebar'
import { Topbar } from './topbar/Topbar'
import { UsersWorkspace } from './UsersWorkspace'
import { CompanyContext, type CompanyContextState } from './session/company-context'
import type { CompanyStatus } from './platform/access'
import { AccessStateBanner } from './components/access-state/AccessStateBanner'
import { ReadOnlyModeSurface } from './components/read-only/ReadOnlyModeSurface'
import './tokens.css'
import './App.css'

const Dashboard = lazy(() => import('./dashboard/product/ui/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const Processes = lazy(() => import('./Processes').then((module) => ({ default: module.Processes })))
const ProcessDetail = lazy(() => import('./ProcessDetail').then((module) => ({ default: module.ProcessDetail })))
const Deadlines = lazy(() => import('./Deadlines').then((module) => ({ default: module.Deadlines })))
const Agenda = lazy(() => import('./Agenda').then((module) => ({ default: module.Agenda })))
const Documents = lazy(() => import('./Documents').then((module) => ({ default: module.Documents })))
const PieceTemplates = lazy(() => import('./PieceTemplates').then((module) => ({ default: module.PieceTemplates })))
const Tasks = lazy(() => import('./Tasks').then((module) => ({ default: module.Tasks })))
const Atendimentos = lazy(() => import('./Atendimentos').then((module) => ({ default: module.Atendimentos })))
const Clients = lazy(() => import('./Clients').then((module) => ({ default: module.Clients })))
const CrmJuridico = lazy(() => import('./CrmJuridico').then((module) => ({ default: module.CrmJuridico })))
const Publications = lazy(() => import('./Publications').then((module) => ({ default: module.Publications })))
const Triagem = lazy(() => import('./Triagem').then((module) => ({ default: module.Triagem })))
const Financeiro = lazy(() => import('./Financeiro').then((module) => ({ default: module.Financeiro })))

// Initialize monitoring on app load
initMonitoring()

type User = { id: number; email: string; role: string }
type HomePayload = { profile: string; home: { menu: string[]; cards: string[] } }
type SessionContextMeta = {
  companyId: string
  companyName: string
  companyStatus: CompanyStatus
  userType: CompanyContextState['userType']
}

function asCompanyStatus(input: unknown): CompanyStatus {
  if (input === 'past_due' || input === 'read_only' || input === 'suspended' || input === 'cancelled' || input === 'active') {
    return input
  }
  return 'active'
}

function asUserType(input: unknown): CompanyContextState['userType'] {
  return input === 'external' ? 'external' : 'internal'
}

function mapRoleToCompanyRole(role: string): CompanyContextState['role'] {
  const normalized = role.toUpperCase()
  if (normalized === 'ADM') return 'ADMIN'
  if (normalized === 'ADV') return 'LAWYER'
  if (normalized === 'ATD') return 'ASSISTANT'
  if (normalized === 'OWNER') return 'OWNER'
  if (normalized === 'ASSISTANT') return 'ASSISTANT'
  if (normalized === 'LAWYER') return 'LAWYER'
  if (normalized === 'ADMIN') return 'ADMIN'
  return 'VIEWER'
}

function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    ADM: 'Administrador',
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

  if (pathname === '/financeiro') {
    return {
      title: 'Financeiro',
      subtitle: 'Controle contas, cobranças, baixas, inadimplência e conciliação com visão operacional contínua.',
      badge: 'Financeiro',
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

function UsersList({ users, permissions, onRefresh }: { users: User[]; permissions: string[]; onRefresh: () => Promise<void> }) {
  const handleRefresh = useEffectEvent(() => {
    void onRefresh()
  })

  useEffect(() => {
    handleRefresh()
  }, [])

  return <UsersWorkspace users={users} permissions={permissions} />
}

function AppShell({
  user,
  users,
  permissions,
  error,
  fetchHome,
  fetchUsers,
  fetchPermissions,
  onLogout,
}: {
  user: User
  users: User[]
  permissions: string[]
  error: string
  fetchHome: () => Promise<void>
  fetchUsers: () => Promise<void>
  fetchPermissions: () => Promise<void>
  onLogout: () => void
}) {
  const location = useLocation()
  const pageMeta = getPageMeta(location.pathname, user.role)
  const isDashboard = location.pathname === '/'
  const isCrmJuridico = location.pathname === '/crm-juridico'
  // Rotas que gerenciam seu próprio refresh — não exibir "Atualizar dados" global
  const isSelfManaged = ['/tarefas', '/processos', '/prazos', '/agenda', '/documentos', '/clientes', '/atendimentos', '/publicacoes-intimacoes', '/financeiro', '/triagem', '/modelos-pecas'].some(r => location.pathname === r || location.pathname.startsWith(r + '/'))
  const shortName = (user.email || getRoleLabel(user.role)).split('@')[0].slice(0, 12)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const loadUsersOnRoute = useEffectEvent(() => {
    if (location.pathname === '/usuarios' && user.role === 'ADM') {
      void fetchUsers()
      void fetchPermissions()
    }
  })

  useEffect(() => {
    loadUsersOnRoute()
  }, [location.pathname, user.role])

  useEffect(() => {
    if (window.innerWidth >= 768) return

    const handle = window.requestAnimationFrame(() => {
      setSidebarOpen(false)
    })

    return () => window.cancelAnimationFrame(handle)
  }, [location.pathname])

  useEffect(() => {
    let lastWidth = window.innerWidth
    const onResize = () => {
      const width = window.innerWidth
      if (width === lastWidth) return
      lastWidth = width

      if (width < 768) {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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
          userEmail={user.email || ''}
          userRole={user.role || ''}
          notificationCount={3}
          onMenuClick={handleNavToggle}
          onLogout={onLogout}
          onNotifications={() => trackEvent('notifications_opened')}
          onHelp={() => trackEvent('help_opened')}
          onShortcuts={() => trackEvent('shortcuts_opened')}
        />

        {!isCrmJuridico ? (
          <header className={`page-header-shell${isDashboard ? ' page-header-shell--dashboard' : ''}${isSelfManaged ? ' page-header-shell--self-managed' : ''}`}>
            <div>
              <div className="page-header-badge">{pageMeta.badge}</div>
              <h1>{pageMeta.title}</h1>
              <p>{pageMeta.subtitle}</p>
            </div>

            {!isSelfManaged && (
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
            )}
          </header>
        ) : null}

        <AccessStateBanner />
        {error && <p className="error">{error}</p>}

        <ReadOnlyModeSurface>
          <section className="shell-content-canvas">
            <Suspense fallback={<div className="page-content">Carregando...</div>}>
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
                <Route path="/financeiro" element={<Financeiro user={user} />} />
                <Route path="/publicacoes-intimacoes" element={<Publications user={user} />} />
                <Route path="/triagem" element={<Triagem user={user} />} />
                <Route
                  path="/usuarios"
                  element={user.role === 'ADM' ? <UsersList users={users} permissions={permissions} onRefresh={fetchUsers} /> : <Navigate to="/" replace />}
                />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </section>
        </ReadOnlyModeSurface>
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
  const [permissions, setPermissions] = useState<string[]>([])
  const [sessionContextMeta, setSessionContextMeta] = useState<SessionContextMeta>({
    companyId: 'unknown',
    companyName: 'Unknown Company',
    companyStatus: 'active',
    userType: 'internal',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const hasRestoredSessionRef = useRef(false)

  useEffect(() => {
    if (hasRestoredSessionRef.current) return
    hasRestoredSessionRef.current = true
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
      const meRes = await api.getMe()

      if (meRes.status !== 200) {
        throw new Error(meRes.error || 'Sessão não encontrada')
      }

      const homeRes = await api.getHome()

      if (homeRes.status === 200) {
        const meUser = meRes.data.user || {}
        const meUserRecord = meUser as Record<string, unknown>
        const companyRaw = (meRes.data as { company?: Record<string, unknown> }).company ?? {}
        const companyStatus = asCompanyStatus(companyRaw.status ?? meUserRecord.companyStatus ?? meUserRecord.status)
        const userType = asUserType(meUserRecord.userType)
        const companyId = String(companyRaw.id ?? meUserRecord.companyId ?? 'unknown')
        const companyName = String(companyRaw.name ?? meUserRecord.companyName ?? 'Unknown Company')

        setSessionContextMeta({
          companyId,
          companyName,
          companyStatus,
          userType,
        })

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

      throw new Error(homeRes.error || 'Erro ao restaurar sessão')
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

  const fetchPermissions = async () => {
    try {
      const res = await api.getPermissions()
      if (res.status === 200 && Array.isArray(res.data)) {
        setPermissions(res.data)
        return
      }

      throw new Error(res.error || 'Erro ao carregar permissões')
    } catch (err) {
      setPermissions([])
      trackEvent('permissions_error', { error: (err as Error).message })
    }
  }

  const login = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const res = await api.login(email, password)
      if (res.status === 200) {
        const loginUser = res.data.user as unknown as Record<string, unknown>
        setSessionContextMeta((current) => ({
          ...current,
          companyStatus: asCompanyStatus(loginUser.companyStatus ?? loginUser.status),
          userType: asUserType(loginUser.userType),
          companyId: String(loginUser.companyId ?? current.companyId),
          companyName: String(loginUser.companyName ?? current.companyName),
        }))
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
      <CompanyContext.Provider
        value={{
          companyId: sessionContextMeta.companyId,
          companyName: sessionContextMeta.companyName,
          status: sessionContextMeta.companyStatus,
          userType: sessionContextMeta.userType,
          role: mapRoleToCompanyRole(user.role),
        }}
      >
        <AppShell
          user={user}
          users={users}
          permissions={permissions}
          error={error}
          fetchHome={fetchHome}
          fetchUsers={fetchUsers}
          fetchPermissions={fetchPermissions}
          onLogout={async () => {
            trackEvent('logout', { role: user.role })
            await api.logout()
            setUser(null)
            setHome(null)
            setUsers([])
            setPermissions([])
            setSessionContextMeta({
              companyId: 'unknown',
              companyName: 'Unknown Company',
              companyStatus: 'active',
              userType: 'internal',
            })
          }}
        />
      </CompanyContext.Provider>
    </Router>
  )
}

export default App
