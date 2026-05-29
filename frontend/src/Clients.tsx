import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Briefcase,
  Building2,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Filter,
  LayoutGrid,
  List,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  User,
  X,
} from 'lucide-react';
import { EmptyState, StatusPill } from './components/product';
import { Badge, Button } from './components/ui';
import { ClientPortalPanel } from './components/clients/ClientPortalPanel';
import { ClientCommunicationPanel } from './components/communication/ClientCommunicationPanel';
import { api, type ApiClient } from './api';
import { captureException, trackEvent, trackPageView } from './monitoring';
import './Clients.css';

interface ClientsProps {
  user: { id: number; email: string; role: string };
}

type ClientStatus = 'ativo' | 'inativo' | 'prospecto' | 'encerrado';
type ClientType = 'PF' | 'PJ';
type ViewMode = 'lista' | 'cards';
type SortField = 'nome' | 'ultima_interacao' | 'processos' | 'pendencias';

interface ClientItem {
  id: string;
  nome: string;
  tipo: ClientType;
  cpfCnpj: string;
  telefone: string;
  email: string;
  status: ClientStatus;
  areaJuridica: string;
  responsavel: string;
  processos: { id: number; label: string; title: string; status: string }[];
  ultimoAtendimento: string | null;
  pendencias: number;
  documentosFaltantes: number;
  atendimentoPendente: boolean;
  observacoes: string;
  createdAt: string;
}

interface ClientFilters {
  query: string;
  status: string;
  area: string;
  responsible: string;
  tipo: string;
  period: string;
  comProcessoAtivo: boolean;
  aguardandoRetorno: boolean;
  comDocumentoFaltante: boolean;
}

interface NewClientForm {
  nome: string;
  cpfCnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  tipo: ClientType;
  status: ClientStatus;
  areaJuridica: string;
  responsavel: string;
  observacoes: string;
}

const AREAS = ['Trabalhista', 'Cível', 'Tributário', 'Empresarial', 'Previdenciário'];

const STATUS_CFG: Record<ClientStatus, { label: string; variant: string }> = {
  ativo:      { label: 'Ativo',      variant: 'success' },
  inativo:    { label: 'Inativo',    variant: 'muted'   },
  prospecto:  { label: 'Prospecto',  variant: 'brand'   },
  encerrado:  { label: 'Encerrado',  variant: 'error'   },
};

const EMPTY_FILTERS: ClientFilters = {
  query: '',
  status: '',
  area: '',
  responsible: '',
  tipo: '',
  period: '',
  comProcessoAtivo: false,
  aguardandoRetorno: false,
  comDocumentoFaltante: false,
};

const EMPTY_FORM: NewClientForm = {
  nome: '',
  cpfCnpj: '',
  telefone: '',
  email: '',
  endereco: '',
  tipo: 'PF',
  status: 'ativo',
  areaJuridica: '',
  responsavel: '',
  observacoes: '',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR');
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  if (diff < 7)  return `${diff} dias atrás`;
  if (diff < 30) return `${Math.floor(diff / 7)} sem. atrás`;
  return formatDate(iso.slice(0, 10));
}

function isWithinDays(iso: string, days: number) {
  const diff = (Date.now() - new Date(iso).getTime()) / 864e5;
  return diff >= 0 && diff <= days;
}

function mapClientRecord(client: ApiClient): ClientItem {
  return {
    id: String(client.id),
    nome: client.name,
    tipo: client.type,
    cpfCnpj: client.cpfCnpj || '',
    telefone: client.phone || '—',
    email: client.email || '—',
    status: client.status,
    areaJuridica: client.legalArea || 'Não definida',
    responsavel: client.responsible || 'Não definido',
    processos: client.processes.map((process) => ({
      id: process.id,
      label: `#${process.id}`,
      title: process.title,
      status: process.status,
    })),
    ultimoAtendimento: client.metrics.lastAttendanceAt ? client.metrics.lastAttendanceAt.slice(0, 10) : null,
    pendencias: client.metrics.pendingItems,
    documentosFaltantes: client.metrics.pendingDocumentsCount,
    atendimentoPendente: client.metrics.pendingAttendance,
    observacoes: client.notes || '',
    createdAt: client.createdAt.slice(0, 10),
  };
}

// ─── sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ClientStatus }) {
  const cfg = STATUS_CFG[status];
  const tone = cfg.variant === 'success' ? 'positive' : cfg.variant === 'error' ? 'critical' : cfg.variant === 'brand' ? 'info' : 'neutral';
  return (
    <StatusPill tone={tone} aria-label={`Status: ${cfg.label}`}>
      {cfg.label}
    </StatusPill>
  );
}

function TypeChip({ tipo }: { tipo: ClientType }) {
  return (
    <Badge className={`cli-type-chip cli-type-chip--${tipo.toLowerCase()}`} variant="neutral" aria-label={tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}>
      {tipo === 'PF' ? <User size={11} aria-hidden="true" /> : <Building2 size={11} aria-hidden="true" />}
      {tipo}
    </Badge>
  );
}

function PendenciaBadge({ count }: { count: number }) {
  if (count === 0) return <span className="cli-ok-dot" aria-label="Sem pendências"><CheckCircle2 size={13} /></span>;
  return (
    <Badge className={`cli-pend-badge${count >= 3 ? ' cli-pend-badge--high' : ''}`} variant="neutral" aria-label={`${count} pendência${count > 1 ? 's' : ''}`}>
      {count}
    </Badge>
  );
}

// ─── DETAIL TABS ──────────────────────────────────────────────────────────────

const DETAIL_TABS = ['Resumo', 'Portal', 'Comunicação', 'Processos', 'Cadastro'] as const;
type DetailTab = typeof DETAIL_TABS[number];

function ClientDetailView({
  client,
  user,
  initialTab,
  onClose,
  onGoToAtendimento,
  onOpenProcesso,
  onOpenDocuments,
}: {
  client: ClientItem;
  user: { email: string };
  initialTab: DetailTab;
  onClose: () => void;
  onGoToAtendimento: (client: ClientItem) => void;
  onOpenProcesso: (processId: number) => void;
  onOpenDocuments: (client: ClientItem, processId?: number) => void;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, client.id]);

  return (
    <div className="cli-detail-overlay" onClick={onClose} aria-hidden="true">
      <aside
        className="cli-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhe do cliente: ${client.nome}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="cli-detail-head">
          <div className="cli-detail-head-left">
            <div className="cli-detail-avatar">{client.nome.charAt(0).toUpperCase()}</div>
            <div>
              <h3>{client.nome}</h3>
              <div className="cli-detail-head-meta">
                <TypeChip tipo={client.tipo} />
                <StatusBadge status={client.status} />
                <span className="cli-detail-area">{client.areaJuridica}</span>
              </div>
            </div>
          </div>
          <Button className="cli-close-btn" variant="ghost" size="sm" onClick={onClose} aria-label="Fechar detalhe"><X size={16} /></Button>
        </div>

        {/* Tabs */}
        <div className="cli-detail-tabs-shell">
          <div className="cli-detail-tabs" role="tablist" aria-label="Seções do cliente">
            {DETAIL_TABS.map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                className={`cli-detail-tab${activeTab === tab ? ' cli-detail-tab--active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab panels */}
        <div className="cli-detail-body" role="tabpanel" aria-label={activeTab}>

          {activeTab === 'Resumo' && (
            <div className="cli-detail-section-list">
              <div className="cli-detail-kpi-row">
                <div className="cli-detail-kpi">
                  <p>Processos</p>
                  <strong>{client.processos.length}</strong>
                </div>
                <div className="cli-detail-kpi">
                  <p>Pendências</p>
                  <strong>{client.pendencias}</strong>
                </div>
                <div className="cli-detail-kpi">
                  <p>Docs. faltantes</p>
                  <strong>{client.documentosFaltantes}</strong>
                </div>
                <div className="cli-detail-kpi">
                  <p>Último contato</p>
                  <strong className="cli-detail-kpi-sm">{formatRelative(client.ultimoAtendimento)}</strong>
                </div>
              </div>

              <div className="cli-detail-row2">
                <div className="cli-detail-section">
                  <span className="cli-detail-label">Contato</span>
                  <span className="cli-detail-val">
                    <Phone size={12} aria-hidden="true" /> {client.telefone}
                  </span>
                  <span className="cli-detail-val">
                    <Mail size={12} aria-hidden="true" /> {client.email}
                  </span>
                </div>

                <div className="cli-detail-section">
                  <span className="cli-detail-label">Responsável</span>
                  <span className="cli-detail-val">{client.responsavel}</span>
                </div>
              </div>

              <div className="cli-detail-summary-grid">
                <div className="cli-detail-summary-card">
                  <span className="cli-detail-label">Atendimento</span>
                  {client.atendimentoPendente ? (
                    <div className="cli-detail-alert">
                      <AlertTriangle size={14} aria-hidden="true" />
                      Atendimento pendente — ligar ou enviar retorno.
                    </div>
                  ) : (
                    <div className="cli-detail-ok">
                      <CheckCircle2 size={14} /> Sem retorno pendente.
                    </div>
                  )}
                </div>

                <div className="cli-detail-summary-card">
                  <span className="cli-detail-label">Documentos</span>
                  {client.documentosFaltantes > 0 ? (
                    <div className="cli-detail-alert cli-detail-alert--doc">
                      <FileText size={14} />
                      {client.documentosFaltantes} documento{client.documentosFaltantes > 1 ? 's' : ''} faltando no checklist.
                    </div>
                  ) : (
                    <div className="cli-detail-ok">
                      <CheckCircle2 size={14} /> Checklist documental completo.
                    </div>
                  )}
                </div>
              </div>

              <div className="cli-detail-section">
                <span className="cli-detail-label">Último atendimento</span>
                <p className="cli-detail-empty cli-detail-empty--info">
                  {client.ultimoAtendimento
                    ? formatDate(client.ultimoAtendimento)
                    : 'Nenhum atendimento registrado.'}
                </p>
              </div>

              <div className="cli-detail-section">
                <span className="cli-detail-label">Processo principal</span>
                {client.processos[0] ? (
                  <button
                    className="cli-process-chip cli-process-chip--primary"
                    onClick={() => onOpenProcesso(client.processos[0].id)}
                    aria-label={`Abrir processo principal ${client.processos[0].label}: ${client.processos[0].title}`}
                  >
                    <Briefcase size={12} aria-hidden="true" />
                    <span>{client.processos[0].label}</span>
                    <span className="cli-process-chip-title">{client.processos[0].title}</span>
                    <ExternalLink size={11} aria-hidden="true" />
                  </button>
                ) : (
                  <p className="cli-detail-empty">Nenhum processo vinculado.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Portal' && (
            <ClientPortalPanel
              clientId={Number(client.id)}
              clientName={client.nome}
              onOpenProcess={onOpenProcesso}
              onOpenDocuments={(processId) => onOpenDocuments(client, processId)}
            />
          )}

          {activeTab === 'Comunicação' && (
            <ClientCommunicationPanel
              client={{
                id: Number(client.id),
                nome: client.nome,
                email: client.email,
                telefone: client.telefone,
                processos: client.processos,
              }}
              userEmail={user.email}
              onOpenDocuments={(processId) => onOpenDocuments(client, processId)}
              onOpenProcess={onOpenProcesso}
            />
          )}

          {activeTab === 'Processos' && (
            <div className="cli-detail-section-list">
              <div className="cli-detail-section">
                <span className="cli-detail-label">Processos vinculados</span>
                {client.processos.length === 0 ? (
                  <p className="cli-detail-empty">Nenhum processo vinculado.</p>
                ) : (
                  client.processos.map((p) => (
                    <div key={p.id} className="cli-process-row">
                      <div>
                        <span className="cli-process-row-label">{p.label}</span>
                        <span className="cli-process-row-title">{p.title}</span>
                      </div>
                      <span className="cli-badge cli-badge--muted">{p.status}</span>
                      <Button
                        className="cli-open-btn"
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenProcesso(p.id)}
                        aria-label={`Abrir processo ${p.label}`}
                      >
                        <ExternalLink size={13} /> Abrir
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'Cadastro' && (
            <div className="cli-detail-section-list">
              <div className="cli-detail-row2">
                <div className="cli-detail-section">
                  <span className="cli-detail-label">Nome / Razão social</span>
                  <span className="cli-detail-val cli-detail-val--strong">{client.nome}</span>
                </div>
                <div className="cli-detail-section">
                  <span className="cli-detail-label">CPF / CNPJ</span>
                  <span className="cli-detail-val">{client.cpfCnpj || '—'}</span>
                </div>
              </div>
              <div className="cli-detail-row2">
                <div className="cli-detail-section">
                  <span className="cli-detail-label">Tipo</span>
                  <TypeChip tipo={client.tipo} />
                </div>
                <div className="cli-detail-section">
                  <span className="cli-detail-label">Status</span>
                  <StatusBadge status={client.status} />
                </div>
              </div>
              <div className="cli-detail-row2">
                <div className="cli-detail-section">
                  <span className="cli-detail-label">Área principal</span>
                  <span className="cli-detail-val">{client.areaJuridica}</span>
                </div>
                <div className="cli-detail-section">
                  <span className="cli-detail-label">Cliente desde</span>
                  <span className="cli-detail-val">{formatDate(client.createdAt)}</span>
                </div>
              </div>
              {client.observacoes && (
                <div className="cli-detail-section">
                  <span className="cli-detail-label">Observações</span>
                  <p className="cli-detail-obs">{client.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="cli-detail-foot">
          <Button
            variant="default"
            onClick={() => onGoToAtendimento(client)}
            aria-label="Registrar atendimento para este cliente"
          >
            <MessageSquare size={13} /> Registrar atendimento
          </Button>
          {client.processos[0] && (
            <Button
              variant="outline"
              onClick={() => onOpenProcesso(client.processos[0].id)}
              aria-label="Abrir processo principal do cliente"
            >
              <Briefcase size={13} /> Ver processo
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={onClose}
            aria-label="Fechar painel de detalhe"
          >
            Fechar
          </Button>
        </div>
      </aside>
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────────

export function Clients({ user }: ClientsProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [clients, setClients]           = useState<ClientItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');

  const [filters, setFilters]           = useState<ClientFilters>(EMPTY_FILTERS);
  const [viewMode, setViewMode]         = useState<ViewMode>('lista');
  const [sortBy, setSortBy]             = useState<SortField>('nome');
  const [sortDesc, setSortDesc]         = useState(false);
  const [page, setPage]                 = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);
  const [detailInitialTab, setDetailInitialTab] = useState<DetailTab>('Resumo');
  const [openMenuId, setOpenMenuId]     = useState<string | null>(null);
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState<NewClientForm>(EMPTY_FORM);
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting]     = useState(false);
  const [isFiltersCompact, setIsFiltersCompact] = useState(() => localStorage.getItem('lexora_cli_filters_compact') !== '0');
  const loadDataOnMount = useEffectEvent(loadData);

  useEffect(() => {
    trackPageView('clientes', { role: user.role });
    loadDataOnMount();
  }, [user.role]);

  useEffect(() => { setPage(1); }, [filters, sortBy, sortDesc, viewMode]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  useEffect(() => {
    const clientId = Number(searchParams.get('clientId') || '');
    if (!clientId || Number.isNaN(clientId)) return;
    const match = clients.find((client) => Number(client.id) === clientId);
    if (!match) return;
    setDetailInitialTab('Resumo');
    setSelectedClient(match);
    const next = new URLSearchParams(searchParams);
    next.delete('clientId');
    setSearchParams(next, { replace: true });
  }, [clients, searchParams, setSearchParams]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getClients();
      if (res.status !== 200 || !Array.isArray(res.data)) {
        setError(res.error || 'Não foi possível carregar clientes.');
        setLoading(false);
        return;
      }
      const items = res.data.map(mapClientRecord);
      setClients(items);
      trackEvent('clients_loaded', { count: items.length, role: user.role });
    } catch (err) {
      setError((err as Error).message || 'Erro ao carregar clientes');
      captureException(err as Error, { context: 'loadClients' });
    } finally {
      setLoading(false);
    }
  }

  function updateFilter<K extends keyof ClientFilters>(key: K, value: ClientFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setSuccess('Filtros limpos.');
  }

  function goToAtendimento(client?: ClientItem) {
    navigate('/atendimentos', {
      state: {
        openForm: true,
        source: 'clientes',
        prefill: client ? {
          client: client.nome,
          processId: client.processos[0] ? String(client.processos[0].id) : '',
          responsavel: client.responsavel !== 'Não definido' ? client.responsavel : user.email.split('@')[0],
          assunto: client.atendimentoPendente ? 'Retorno pendente do cliente' : '',
          proximoPasso: client.atendimentoPendente ? 'Retornar contato com o cliente e registrar desdobramentos.' : '',
        } : {
          responsavel: user.email.split('@')[0],
        },
      },
    });
  }

  function openClientDetail(client: ClientItem, tab: DetailTab = 'Resumo') {
    setDetailInitialTab(tab);
    setSelectedClient(client);
  }

  function openClientDocuments(client: ClientItem, processId?: number) {
    const params = new URLSearchParams();
    params.set('client', client.nome);
    if (processId) params.set('processId', String(processId));
    navigate(`/documentos?${params.toString()}`);
  }

  function saveFilters() {
    localStorage.setItem('lexora_cli_filter', JSON.stringify(filters));
    setSuccess('Filtro salvo.');
  }

  function exportCsv(items: ClientItem[]) {
    const header = ['Nome', 'Tipo', 'CPF/CNPJ', 'Telefone', 'E-mail', 'Status', 'Área', 'Processos', 'Último atendimento', 'Pendências'];
    const rows = items.map((c) => [
      c.nome, c.tipo, c.cpfCnpj, c.telefone, c.email,
      STATUS_CFG[c.status].label, c.areaJuridica,
      c.processos.length, formatRelative(c.ultimoAtendimento), c.pendencias,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'clientes.csv'; link.click();
    URL.revokeObjectURL(url);
    trackEvent('clients_exported', { count: items.length });
  }

  function toggleFiltersDensity() {
    setIsFiltersCompact((prev) => {
      const next = !prev;
      localStorage.setItem('lexora_cli_filters_compact', next ? '1' : '0');
      trackEvent('clientes_filters_density_toggled', { mode: next ? 'compact' : 'expanded' });
      return next;
    });
  }

  function applyQuickPreset(preset: string) {
    if (preset === 'sem_contato_recente') {
      setFilters({ ...EMPTY_FILTERS, period: 'sem_contato' });
      setSuccess('Filtro aplicado: Sem contato recente.');
    }
    if (preset === 'aguardando_retorno') {
      setFilters({ ...EMPTY_FILTERS, aguardandoRetorno: true });
      setSuccess('Filtro aplicado: Aguardando retorno.');
    }
    if (preset === 'documentos_faltantes') {
      setFilters({ ...EMPTY_FILTERS, comDocumentoFaltante: true });
      setSuccess('Filtro aplicado: Documentos faltantes.');
    }
  }

  async function submitForm(ev: React.FormEvent) {
    ev.preventDefault();
    setError('');
    const res = await api.createClient({
      name: form.nome,
      type: form.tipo,
      cpfCnpj: form.cpfCnpj || undefined,
      phone: form.telefone || undefined,
      email: form.email || undefined,
      address: form.endereco || undefined,
      status: form.status,
      legalArea: form.areaJuridica || undefined,
      responsible: form.responsavel || undefined,
      notes: form.observacoes || undefined,
    });

    if (res.status !== 201) {
      setError(res.error || 'Não foi possível cadastrar o cliente.');
      return;
    }

    const newClient = mapClientRecord(res.data);
    setClients((prev) => [newClient, ...prev]);
    setShowForm(false);
    setForm(EMPTY_FORM);
    setSuccess('Cliente cadastrado com sucesso.');
    trackEvent('client_created', { tipo: newClient.tipo });
  }

  // ─── row / bulk selection ─────────────────────────────────────────────────

  function handleSelectRow(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }

  function handleSelectAll(checked: boolean) {
    setSelectedIds(checked ? new Set(pageItems.map((c) => c.id)) : new Set());
  }

  async function handleDeleteClient(id: string) {
    setIsDeleting(true);
    try {
      const res = await api.deleteClient(Number(id));
      if (res.status !== 200 && res.status !== 204) {
        setError(res.error || 'Não foi possível excluir o cliente.');
        return;
      }
      setClients((prev) => prev.filter((c) => c.id !== id));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      setSuccess('Cliente excluído.');
      trackEvent('client_deleted', { id });
    } catch (err) {
      setError((err as Error).message || 'Erro ao excluir cliente');
      captureException(err as Error, { context: 'deleteClient' });
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleBulkDelete() {
    const count = selectedIds.size;
    setIsDeleting(true);
    try {
      await Promise.all([...selectedIds].map((id) => api.deleteClient(Number(id))));
      setClients((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
      setSuccess(`${count} cliente(s) excluído(s).`);
      trackEvent('clients_bulk_deleted', { count });
    } catch (err) {
      setError((err as Error).message || 'Erro ao excluir clientes');
      captureException(err as Error, { context: 'bulkDeleteClients' });
    } finally {
      setIsDeleting(false);
    }
  }

  // ─── computed ──────────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const total   = clients.length;
    const ativos  = clients.filter((c) => c.status === 'ativo').length;
    const comProc = clients.filter((c) => c.processos.length > 0).length;
    const aguard  = clients.filter((c) => c.atendimentoPendente).length;
    const docFalt = clients.filter((c) => c.documentosFaltantes > 0).length;
    return { total, ativos, comProc, aguard, docFalt };
  }, [clients]);

  const uniqueAreas       = useMemo(() => [...new Set(clients.map((c) => c.areaJuridica))].sort(), [clients]);
  const uniqueResponsaveis = useMemo(() => [...new Set(clients.map((c) => c.responsavel))].sort(), [clients]);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const hay = `${c.nome} ${c.cpfCnpj} ${c.telefone} ${c.email} ${c.processos.map((p) => p.label + ' ' + p.title).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.status      && c.status        !== filters.status)       return false;
      if (filters.area        && c.areaJuridica   !== filters.area)        return false;
      if (filters.responsible && c.responsavel    !== filters.responsible)  return false;
      if (filters.tipo        && c.tipo           !== filters.tipo)        return false;

      if (filters.period === 'recente') {
        if (!c.ultimoAtendimento || !isWithinDays(c.ultimoAtendimento, 30)) return false;
      } else if (filters.period === 'sem_contato') {
        if (c.ultimoAtendimento && isWithinDays(c.ultimoAtendimento, 30)) return false;
      }

      if (filters.comProcessoAtivo     && c.processos.length === 0)       return false;
      if (filters.aguardandoRetorno && !c.atendimentoPendente)            return false;
      if (filters.comDocumentoFaltante  && c.documentosFaltantes === 0)  return false;

      return true;
    });
  }, [clients, filters]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'nome')            cmp = a.nome.localeCompare(b.nome);
      else if (sortBy === 'processos')  cmp = a.processos.length - b.processos.length;
      else if (sortBy === 'pendencias') cmp = a.pendencias - b.pendencias;
      else if (sortBy === 'ultima_interacao') {
        const da = a.ultimoAtendimento ?? '0000-00-00';
        const db = b.ultimoAtendimento ?? '0000-00-00';
        cmp = da.localeCompare(db);
      }
      return sortDesc ? -cmp : cmp;
    });
    return arr;
  }, [filtered, sortBy, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
  const pageItems  = sorted.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const hasActiveFilters = Object.entries(filters).some(([, v]) => typeof v === 'boolean' ? v : v !== '');

  // ─── row render ────────────────────────────────────────────────────────────

  function renderRow(c: ClientItem) {
    const isMenuOpen = openMenuId === c.id;
    const isSelected = selectedIds.has(c.id);
    return (
      <tr
        key={c.id}
        className={`cli-table-row${isSelected ? ' is-selected-row' : ''}`}
        onClick={() => openClientDetail(c)}
        tabIndex={0}
        aria-label={`Cliente ${c.nome}`}
        onKeyDown={(e) => e.key === 'Enter' && openClientDetail(c)}
      >
        <td className="cli-td-checkbox" onClick={e => e.stopPropagation()}>
          <input 
            type="checkbox" 
            checked={isSelected}
            onChange={e => handleSelectRow(c.id, e.target.checked)}
            aria-label={`Selecionar ${c.nome}`}
          />
        </td>
        <td className="cli-td-client">
          <span className="cli-avatar-sm" aria-hidden="true">{c.nome.charAt(0)}</span>
          <div>
            <span className="cli-client-name">{c.nome}</span>
            <span className="cli-client-sub">{c.cpfCnpj}</span>
          </div>
        </td>
        <td className="cli-td-contact">
          <span className="cli-contact-line">
            <Phone size={11} aria-hidden="true" /> {c.telefone}
          </span>
          <span className="cli-contact-line">
            <Mail size={11} aria-hidden="true" /> {c.email}
          </span>
        </td>
        <td>
          <TypeChip tipo={c.tipo} />
          <span className="cli-area-txt">{c.areaJuridica}</span>
        </td>
        <td className="cli-td-proc">
          {c.processos.length === 0
            ? <span className="cli-none-txt">—</span>
            : (
              <span className="cli-proc-count">
                <Briefcase size={12} aria-hidden="true" />
                {c.processos.length} processo{c.processos.length !== 1 ? 's' : ''}
              </span>
            )
          }
        </td>
        <td className="cli-td-ult">
          <span className={`cli-ult-txt${!c.ultimoAtendimento ? ' cli-ult-txt--none' : ''}`}>
            {formatRelative(c.ultimoAtendimento)}
          </span>
        </td>
        <td>
          <PendenciaBadge count={c.pendencias} />
          {c.documentosFaltantes > 0 && (
            <span className="cli-doc-missing" aria-label={`${c.documentosFaltantes} documento${c.documentosFaltantes > 1 ? 's' : ''} faltando`}>
              <FileText size={11} aria-hidden="true" /> {c.documentosFaltantes}
            </span>
          )}
        </td>
        <td className="cli-td-resp">{c.responsavel}</td>
        <td className="cli-td-status"><StatusBadge status={c.status} /></td>
        <td className="cli-td-actions" onClick={(e) => e.stopPropagation()}>
          <div className="cli-menu-wrap">
            <button
              className="cli-menu-trigger"
              aria-label={`Ações para ${c.nome}`}
              aria-expanded={isMenuOpen}
              aria-haspopup="true"
              onClick={() => setOpenMenuId(isMenuOpen ? null : c.id)}
            >
              <MoreHorizontal size={15} />
            </button>
            {isMenuOpen && (
              <ul className="cli-ctx-menu" role="menu">
                <li role="none">
                  <button role="menuitem" onClick={() => { openClientDetail(c); setOpenMenuId(null); }}>
                    <User size={13} /> Ver detalhe
                  </button>
                </li>
                <li role="none">
                  <button role="menuitem" onClick={() => { openClientDetail(c, 'Comunicação'); setOpenMenuId(null); }}>
                    <Mail size={13} /> Comunicar cliente
                  </button>
                </li>
                <li role="none">
                  <button role="menuitem" onClick={() => { openClientDetail(c, 'Portal'); setOpenMenuId(null); }}>
                    <ExternalLink size={13} /> Ver portal
                  </button>
                </li>
                <li role="none">
                  <button role="menuitem" onClick={() => { goToAtendimento(c); setOpenMenuId(null); }}>
                    <MessageSquare size={13} /> Registrar atendimento
                  </button>
                </li>
                {c.processos[0] && (
                  <li role="none">
                    <button role="menuitem" onClick={() => { navigate(`/processos/${c.processos[0].id}`); setOpenMenuId(null); }}>
                      <ExternalLink size={13} /> Abrir processo
                    </button>
                  </li>
                )}
                <li role="none">
                  <button role="menuitem" onClick={() => { openClientDocuments(c); setOpenMenuId(null); }}>
                    <FileText size={13} /> Ver documentos
                  </button>
                </li>
                {user.role === 'ADM' || user.role === 'FIN' ? (
                  <li role="none">
                    <button role="menuitem" className="cli-danger-action" onClick={() => { handleDeleteClient(c.id); setOpenMenuId(null); }}>
                      <X size={13} /> Excluir cliente
                    </button>
                  </li>
                ) : null}
              </ul>
            )}
          </div>
        </td>
      </tr>
    );
  }

  // ─── JSX ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="clients-page"
      onClick={() => { if (openMenuId) setOpenMenuId(null); }}
    >

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="my-processes-header" aria-label="Cabeçalho da carteira de clientes">
        <div className="my-processes-header-copy">
          <p className="my-processes-header-eyebrow">CARTEIRA E RELACIONAMENTO</p>
          <h1 className="my-processes-header-title">Clientes</h1>
          <p className="my-processes-header-subtitle">Acompanhe clientes, retornos e vínculos com processos. Busque rapidamente e acione atendimento ou processo sem sair da carteira.</p>
          <div className="my-processes-header-chips" aria-label="Pulso da carteira">
            <div className="my-processes-header-summary-chip" data-tone="positive">
              <strong>{kpis.ativos}</strong>
              <span>Ativos</span>
            </div>
            <div className="my-processes-header-summary-chip" data-tone="warning">
              <strong>{kpis.aguard}</strong>
              <span>Aguardando Retorno</span>
            </div>
            <div className="my-processes-header-summary-chip" data-tone="critical">
              <strong>{kpis.docFalt}</strong>
              <span>Doc. Faltante</span>
            </div>
            <div className="my-processes-header-pulse" data-tone={kpis.aguard > 0 || kpis.docFalt > 0 ? "warning" : "positive"}>
              <span className="my-processes-header-pulse-dot" aria-hidden="true" />
              <span>{kpis.aguard > 0 || kpis.docFalt > 0 ? 'Atenção Necessária' : 'Carteira Saudável'}</span>
            </div>
          </div>
        </div>
        <div className="my-processes-header-actions">
          <button className="btn-primary" onClick={() => setShowForm(true)} aria-label="Cadastrar novo cliente">
            <Plus size={14} /> Novo Cliente
          </button>
          <button className="btn-secondary" onClick={() => goToAtendimento()} aria-label="Registrar atendimento rápido">
            <MessageSquare size={14} /> Registrar Atendimento
          </button>
          <button className="btn-secondary" onClick={() => exportCsv(sorted)} aria-label="Exportar clientes como CSV">
            <Download size={14} /> Exportar
          </button>
        </div>
      </header>

      {/* ── Bulk Actions Bar ────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="cli-bulk-bar">
          <span className="cli-bulk-count">{selectedIds.size} selecionado(s)</span>
          <div className="cli-bulk-actions">
            {user.role === 'ADM' || user.role === 'FIN' ? (
              <button className="btn-danger" onClick={handleBulkDelete} disabled={isDeleting}>
                <X size={14} /> Excluir Selecionados
              </button>
            ) : null}
            <button className="btn-ghost" onClick={() => setSelectedIds(new Set())}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Alerts ──────────────────────────────────────────────── */}
      {error && (
        <div className="cli-alert cli-alert--error" role="alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadData} aria-label="Tentar novamente">
            <RefreshCw size={14} /> Tentar novamente
          </Button>
        </div>
      )}
      {success && (
        <div className="cli-alert cli-alert--success" role="status" aria-live="polite">
          <CheckCircle2 size={16} /><span>{success}</span>
        </div>
      )}

      {/* ── KPIs ────────────────────────────────────────────────── */}
      <section className="my-processes-kpis" aria-label="Resumo da carteira">
        <button type="button" className="metric-card" data-kpi-color="neutral" onClick={() => clearFilters()} aria-label={`Total de clientes: ${kpis.total}`}>
          <div className="metric-top-row">
            <p className="metric-value">{loading ? '—' : kpis.total}</p>
            <div className="metric-icon" aria-hidden="true"><User size={16} /></div>
          </div>
          <p className="metric-label">Total de clientes</p>
          <p className="metric-microtext">Na sua carteira</p>
        </button>
        <button type="button" className="metric-card" data-kpi-color="positive" onClick={() => updateFilter('status', 'ativo')} aria-label={`Clientes ativos: ${kpis.ativos}`}>
          <div className="metric-top-row">
            <p className="metric-value">{loading ? '—' : kpis.ativos}</p>
            <div className="metric-icon" aria-hidden="true"><CheckCircle2 size={16} /></div>
          </div>
          <p className="metric-label">Clientes ativos</p>
          <p className="metric-microtext">Status regular</p>
        </button>
        <button type="button" className="metric-card" data-kpi-color="info" onClick={() => updateFilter('comProcessoAtivo', !filters.comProcessoAtivo)} aria-pressed={filters.comProcessoAtivo} aria-label={`Com processo ativo: ${kpis.comProc}`}>
          <div className="metric-top-row">
            <p className="metric-value">{loading ? '—' : kpis.comProc}</p>
            <div className="metric-icon" aria-hidden="true"><Briefcase size={16} /></div>
          </div>
          <p className="metric-label">Com processo ativo</p>
          <p className="metric-microtext">Em andamento</p>
        </button>
        <button type="button" className="metric-card" data-kpi-color="warning" onClick={() => updateFilter('aguardandoRetorno', !filters.aguardandoRetorno)} aria-pressed={filters.aguardandoRetorno} aria-label={`Aguardando retorno: ${kpis.aguard}`}>
          <div className="metric-top-row">
            <p className="metric-value">{loading ? '—' : kpis.aguard}</p>
            <div className="metric-icon" aria-hidden="true"><AlertTriangle size={16} /></div>
          </div>
          <p className="metric-label">Aguardando retorno</p>
          <p className="metric-microtext">Atenção necessária</p>
        </button>
        <button type="button" className="metric-card" data-kpi-color="critical" onClick={() => updateFilter('comDocumentoFaltante', !filters.comDocumentoFaltante)} aria-pressed={filters.comDocumentoFaltante} aria-label={`Pendência documental: ${kpis.docFalt}`}>
          <div className="metric-top-row">
            <p className="metric-value">{loading ? '—' : kpis.docFalt}</p>
            <div className="metric-icon" aria-hidden="true"><FileText size={16} /></div>
          </div>
          <p className="metric-label">Pendência documental</p>
          <p className="metric-microtext">Faltam documentos</p>
        </button>
      </section>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <section className={`my-processes-filters${isFiltersCompact ? ' is-compact' : ''}`} aria-label="Filtros e pesquisa">
        <div className="filters-header">
          <div className="filter-input-wrap search-wrap">
            <Search size={16} aria-hidden="true" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF/CNPJ, telefone, e-mail..."
              value={filters.query}
              onChange={(e) => updateFilter('query', e.target.value)}
              aria-label="Buscar cliente"
            />
          </div>
          <div className="filter-presets" aria-label="Filtros rápidos">
            <button type="button" className="btn-ghost" onClick={() => applyQuickPreset('sem_contato_recente')}>Sem contato</button>
            <button type="button" className="btn-ghost" onClick={() => applyQuickPreset('aguardando_retorno')}>Aguardando retorno</button>
            <button type="button" className="btn-ghost" onClick={() => applyQuickPreset('documentos_faltantes')}>Doc. faltante</button>
          </div>
          <button
            type="button"
            className="btn-ghost toggle-density-btn"
            onClick={toggleFiltersDensity}
            aria-expanded={!isFiltersCompact}
          >
            {isFiltersCompact ? <List size={16} /> : <Filter size={16} />}
            {isFiltersCompact ? 'Mais filtros' : 'Ocultar filtros'}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setViewMode((m) => m === 'lista' ? 'cards' : 'lista')}
            aria-label={viewMode === 'lista' ? 'Ver em cards' : 'Ver em lista'}
            title={viewMode === 'lista' ? 'Ver em cards' : 'Ver em lista'}
          >
            {viewMode === 'lista' ? <LayoutGrid size={16} aria-hidden="true" /> : <List size={16} aria-hidden="true" />}
          </button>
        </div>

        {!isFiltersCompact && (
          <div className="filters-grid">
            <label className="filter-field">
              Status
              <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
                <option value="">Todos</option>
                {(Object.entries(STATUS_CFG) as [ClientStatus, { label: string; variant: string }][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
            <label className="filter-field">
              Área
              <select value={filters.area} onChange={(e) => updateFilter('area', e.target.value)}>
                <option value="">Todas</option>
                {uniqueAreas.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <label className="filter-field">
              Responsável
              <select value={filters.responsible} onChange={(e) => updateFilter('responsible', e.target.value)}>
                <option value="">Todos</option>
                {uniqueResponsaveis.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="filter-field">
              Tipo
              <select value={filters.tipo} onChange={(e) => updateFilter('tipo', e.target.value)}>
                <option value="">Todos</option>
                <option value="PF">Pessoa Física</option>
                <option value="PJ">Pessoa Jurídica</option>
              </select>
            </label>
            <label className="filter-field">
              Último contato
              <select value={filters.period} onChange={(e) => updateFilter('period', e.target.value)}>
                <option value="">Todos</option>
                <option value="recente">Últimos 30 dias</option>
                <option value="sem_contato">Sem contato recente</option>
              </select>
            </label>

            <div className="filter-checkbox-group">
              <label className="cli-checkline">
                <input type="checkbox" checked={filters.comProcessoAtivo} onChange={(e) => updateFilter('comProcessoAtivo', e.target.checked)} />
                Com processo ativo
              </label>
              <label className="cli-checkline">
                <input type="checkbox" checked={filters.aguardandoRetorno} onChange={(e) => updateFilter('aguardandoRetorno', e.target.checked)} />
                Aguardando retorno
              </label>
              <label className="cli-checkline">
                <input type="checkbox" checked={filters.comDocumentoFaltante} onChange={(e) => updateFilter('comDocumentoFaltante', e.target.checked)} />
                Doc. faltante
              </label>
            </div>

            <div className="filters-footer">
              {hasActiveFilters && (
                <button type="button" className="btn-ghost" onClick={clearFilters}>Limpar tudo</button>
              )}
              <button type="button" className="btn-ghost" onClick={saveFilters} aria-label="Salvar filtro atual">
                <Save size={13} aria-hidden="true" /> Salvar filtro
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Loading ──────────────────────────────────────────────── */}
      {loading && (
        <div className="cli-loading" aria-live="polite" aria-busy="true">
          <RefreshCw size={20} className="cli-spin" aria-hidden="true" />
          <span>Carregando clientes…</span>
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────── */}
      {!loading && !error && (
        <>
          {clients.length === 0 && (
            <EmptyState
              className="cli-empty"
              icon={<User size={32} aria-hidden="true" />}
              title="Nenhum cliente cadastrado"
              description="Cadastre o primeiro cliente para começar a acompanhar sua carteira."
              actionLabel="Novo Cliente"
              onAction={() => setShowForm(true)}
            />
          )}

          {clients.length > 0 && filtered.length === 0 && (
            <EmptyState
              className="cli-empty"
              icon={<Filter size={32} aria-hidden="true" />}
              title="Nenhum cliente para este filtro"
              description="Ajuste os critérios ou limpe os filtros para ver todos os clientes."
              actionLabel="Limpar filtros"
              onAction={clearFilters}
            />
          )}

          {/* ── Lista mode ───────────────────────────────────────── */}
          {filtered.length > 0 && viewMode === 'lista' && (
            <div className="cli-table-card">
              <div className="cli-table-header">
                <div className="cli-table-header-meta">
                  <span className="cli-count-badge">
                    {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
                  </span>
                  <span className="cli-table-range">
                    Exibindo {filtered.length === 0 ? 0 : ((page - 1) * itemsPerPage) + 1}
                    {' '}a {Math.min(page * itemsPerPage, filtered.length)} de {filtered.length}
                  </span>
                </div>
                <div className="cli-sort-controls">
                  <label htmlFor="cli-page-size" className="sr-only">Itens por página</label>
                  <select
                    id="cli-page-size"
                    value={String(itemsPerPage)}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setPage(1); }}
                    aria-label="Itens por página"
                  >
                    <option value="10">10 por página</option>
                    <option value="20">20 por página</option>
                    <option value="50">50 por página</option>
                  </select>
                  <label htmlFor="cli-sort" className="sr-only">Ordenar por</label>
                  <select
                    id="cli-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortField)}
                    aria-label="Ordenar por"
                  >
                    <option value="nome">Nome</option>
                    <option value="ultima_interacao">Último contato</option>
                    <option value="processos">Processos</option>
                    <option value="pendencias">Pendências</option>
                  </select>
                  <Button
                    className="cli-sort-dir"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSortDesc((d) => !d)}
                    aria-label={sortDesc ? 'Decrescente' : 'Crescente'}
                  >
                    {sortDesc ? '↓' : '↑'}
                  </Button>
                </div>
              </div>

              <div className="cli-table-wrap">
                <table className="cli-table" aria-label="Lista de clientes">
                  <thead>
                    <tr>
                      <th scope="col" className="cli-th-checkbox">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.size > 0 && selectedIds.size === pageItems.length}
                          ref={(input) => { if (input) input.indeterminate = selectedIds.size > 0 && selectedIds.size < pageItems.length; }}
                          onChange={e => handleSelectAll(e.target.checked)}
                          aria-label="Selecionar todos os clientes da página"
                        />
                      </th>
                      <th scope="col">Cliente</th>
                      <th scope="col">Contato</th>
                      <th scope="col">Área / Tipo</th>
                      <th scope="col">Processos</th>
                      <th scope="col">Último atendimento</th>
                      <th scope="col">Pendências</th>
                      <th scope="col">Responsável</th>
                      <th scope="col">Status</th>
                      <th scope="col"><span className="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((c) => renderRow(c))}
                  </tbody>
                </table>
              </div>

              <div className="cli-pagination" aria-label="Paginação">
                <span className="cli-pagination-summary">Página {page} de {totalPages}</span>
                <div className="cli-pagination-controls">
                  <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior">Anterior</button>
                  <span aria-live="polite">{page} / {totalPages}</span>
                  <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Próxima página">Próximo</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Cards mode ───────────────────────────────────────── */}
          {filtered.length > 0 && viewMode === 'cards' && (
            <div className="cli-cards-grid" aria-label="Clientes em modo cards">
              {pageItems.map((c) => (
                <div
                  key={c.id}
                  className="cli-card"
                  onClick={() => openClientDetail(c)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Abrir detalhe de ${c.nome}`}
                  onKeyDown={(e) => e.key === 'Enter' && openClientDetail(c)}
                >
                  <div className="cli-card-head">
                    <span className="cli-avatar-md" aria-hidden="true">{c.nome.charAt(0)}</span>
                    <div className="cli-card-head-info">
                      <span className="cli-card-name">{c.nome}</span>
                      <div className="cli-card-chips">
                        <TypeChip tipo={c.tipo} />
                        <StatusBadge status={c.status} />
                      </div>
                    </div>
                  </div>

                  <div className="cli-card-meta">
                    <span className="cli-card-area">{c.areaJuridica}</span>
                  </div>

                  <div className="cli-card-stats">
                    <div className="cli-card-stat">
                      <Briefcase size={12} aria-hidden="true" />
                      <span>{c.processos.length} processo{c.processos.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="cli-card-stat">
                      <MessageSquare size={12} aria-hidden="true" />
                      <span>{formatRelative(c.ultimoAtendimento)}</span>
                    </div>
                  </div>

                  <div className="cli-card-foot">
                    {c.pendencias > 0 && (
                      <span className="cli-pend-badge" aria-label={`${c.pendencias} pendência${c.pendencias > 1 ? 's' : ''}`}>
                        {c.pendencias}
                      </span>
                    )}
                    {c.documentosFaltantes > 0 && (
                      <span className="cli-doc-missing" aria-label={`${c.documentosFaltantes} doc. faltando`}>
                        <FileText size={11} aria-hidden="true" /> {c.documentosFaltantes}
                      </span>
                    )}
                    {c.atendimentoPendente && (
                      <span className="cli-atd-pend" aria-label="Atendimento pendente">
                        <AlertTriangle size={11} aria-hidden="true" /> Retorno
                      </span>
                    )}
                    {c.pendencias === 0 && c.documentosFaltantes === 0 && !c.atendimentoPendente && (
                      <span className="cli-ok-dot" aria-label="Sem pendências">
                        <CheckCircle2 size={13} />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Detail Drawer ────────────────────────────────────────── */}
      {selectedClient && (
        <ClientDetailView
          client={selectedClient}
          user={user}
          initialTab={detailInitialTab}
          onClose={() => {
            setSelectedClient(null);
            setDetailInitialTab('Resumo');
          }}
          onGoToAtendimento={(client) => {
            setSelectedClient(null);
            goToAtendimento(client);
          }}
          onOpenDocuments={(client, processId) => {
            setSelectedClient(null);
            openClientDocuments(client, processId);
          }}
          onOpenProcesso={(processId) => {
            setSelectedClient(null);
            navigate(`/processos/${processId}`);
          }}
        />
      )}

      {/* ── New Client Modal ─────────────────────────────────────── */}
      {showForm && (
        <>
          <div className="cli-modal-overlay" onClick={() => setShowForm(false)} aria-hidden="true" />
          <div
            className="cli-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cli-form-title"
          >
            <div className="cli-modal-head">
              <h3 id="cli-form-title">Novo Cliente</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} aria-label="Fechar formulário">
                <X size={16} />
              </Button>
            </div>

            <form className="cli-form" onSubmit={submitForm} noValidate>
              <div className="cli-form-grid">
                <div className="cli-form-field cli-form-field--full">
                  <label htmlFor="form-nome">Nome completo / Razão social <span aria-hidden="true">*</span></label>
                  <input
                    id="form-nome"
                    type="text"
                    placeholder="Nome completo ou razão social"
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    required
                    aria-required="true"
                  />
                </div>

                <div className="cli-form-field">
                  <label htmlFor="form-cpfcnpj">CPF / CNPJ</label>
                  <input
                    id="form-cpfcnpj"
                    type="text"
                    placeholder="000.000.000-00"
                    value={form.cpfCnpj}
                    onChange={(e) => setForm((f) => ({ ...f, cpfCnpj: e.target.value }))}
                  />
                </div>

                <div className="cli-form-field">
                  <label htmlFor="form-tipo">Tipo <span aria-hidden="true">*</span></label>
                  <select
                    id="form-tipo"
                    value={form.tipo}
                    onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as ClientType }))}
                    required
                    aria-required="true"
                  >
                    <option value="PF">Pessoa Física</option>
                    <option value="PJ">Pessoa Jurídica</option>
                  </select>
                </div>

                <div className="cli-form-field">
                  <label htmlFor="form-tel">Telefone</label>
                  <input
                    id="form-tel"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={form.telefone}
                    onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                  />
                </div>

                <div className="cli-form-field">
                  <label htmlFor="form-email">E-mail</label>
                  <input
                    id="form-email"
                    type="email"
                    placeholder="cliente@email.com"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>

                <div className="cli-form-field cli-form-field--full">
                  <label htmlFor="form-endereco">Endereço</label>
                  <input
                    id="form-endereco"
                    type="text"
                    placeholder="Rua, número, cidade, estado"
                    value={form.endereco}
                    onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
                  />
                </div>

                <div className="cli-form-field">
                  <label htmlFor="form-area">Área jurídica</label>
                  <select id="form-area" value={form.areaJuridica} onChange={(e) => setForm((f) => ({ ...f, areaJuridica: e.target.value }))}>
                    <option value="">Selecionar área</option>
                    {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                <div className="cli-form-field">
                  <label htmlFor="form-status">Status</label>
                  <select id="form-status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ClientStatus }))}>
                    {(Object.entries(STATUS_CFG) as [ClientStatus, { label: string }][]).map(([k, v]) =>
                      <option key={k} value={k}>{v.label}</option>
                    )}
                  </select>
                </div>

                <div className="cli-form-field">
                  <label htmlFor="form-resp">Responsável</label>
                  <input
                    id="form-resp"
                    type="text"
                    placeholder={user.email.split('@')[0]}
                    value={form.responsavel}
                    onChange={(e) => setForm((f) => ({ ...f, responsavel: e.target.value }))}
                  />
                </div>

                <div className="cli-form-field cli-form-field--full">
                  <label htmlFor="form-obs">Observações</label>
                  <textarea
                    id="form-obs"
                    rows={3}
                    placeholder="Contexto adicional sobre o cliente"
                    value={form.observacoes}
                    onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="cli-form-actions">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!form.nome}>
                  <Plus size={14} /> Cadastrar Cliente
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
