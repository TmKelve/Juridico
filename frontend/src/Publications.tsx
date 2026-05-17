import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Save,
  Search,
  X,
} from 'lucide-react';
import { api, type ApiPublication } from './api';
import { captureException, trackEvent, trackPageView } from './monitoring';
import { ProcessCombobox } from './ProcessCombobox';
import './Publications.css';

interface PublicationsProps {
  user: { id: number; email: string; role: string };
}

type PubStatus = 'nova' | 'lida' | 'em_analise' | 'tratada' | 'ignorada';
type PubImpacto = 'critico' | 'alto' | 'medio' | 'baixo' | 'informativo';
type PubTipo =
  | 'intimacao'
  | 'citacao'
  | 'despacho'
  | 'sentenca'
  | 'acordao'
  | 'edital'
  | 'outros';
type ViewMode = 'lista' | 'timeline';
type SortField = 'data' | 'impacto' | 'status' | 'processo';

type PublicationItem = ApiPublication;

interface PubFilters {
  query: string;
  period: string;
  status: string;
  process: string;
  client: string;
  tribunal: string;
  tipo: string;
  impacto: string;
  exigeAcao: boolean;
  convertidaEmPrazo: boolean;
  naoLida: boolean;
}

const EMPTY_FILTERS: PubFilters = {
  query: '',
  period: '',
  status: '',
  process: '',
  client: '',
  tribunal: '',
  tipo: '',
  impacto: '',
  exigeAcao: false,
  convertidaEmPrazo: false,
  naoLida: false,
};

const STATUS_CFG: Record<PubStatus, { label: string; variant: string }> = {
  nova:       { label: 'Nova',        variant: 'brand'   },
  lida:       { label: 'Lida',        variant: 'muted'   },
  em_analise: { label: 'Em análise',  variant: 'info'    },
  tratada:    { label: 'Tratada',     variant: 'success' },
  ignorada:   { label: 'Ignorada',    variant: 'muted'   },
};

const IMPACTO_CFG: Record<PubImpacto, { label: string; variant: string }> = {
  critico:     { label: 'Crítico',      variant: 'critico'     },
  alto:        { label: 'Alto',         variant: 'alto'        },
  medio:       { label: 'Médio',        variant: 'medio'       },
  baixo:       { label: 'Baixo',        variant: 'baixo'       },
  informativo: { label: 'Informativo',  variant: 'informativo' },
};

const TIPO_LABEL: Record<PubTipo, string> = {
  intimacao:  'Intimação',
  citacao:    'Citação',
  despacho:   'Despacho',
  sentenca:   'Sentença',
  acordao:    'Acórdão',
  edital:     'Edital',
  outros:     'Outros',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR');
}

function isWithinDays(iso: string, days: number) {
  const diff = (Date.now() - new Date(iso).getTime()) / 864e5;
  return diff >= 0 && diff <= days;
}

// ─── sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PubStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className={`pub-badge pub-badge--${cfg.variant}`} aria-label={`Status: ${cfg.label}`}>
      {cfg.label}
    </span>
  );
}

function ImpactoBadge({ impacto }: { impacto: PubImpacto }) {
  const cfg = IMPACTO_CFG[impacto];
  return (
    <span className={`pub-impact pub-impact--${cfg.variant}`} aria-label={`Impacto: ${cfg.label}`}>
      {cfg.label}
    </span>
  );
}

function TipoChip({ tipo }: { tipo: PubTipo }) {
  return (
    <span className={`pub-tipo-chip pub-tipo--${tipo}`} aria-label={`Tipo: ${TIPO_LABEL[tipo]}`}>
      {TIPO_LABEL[tipo]}
    </span>
  );
}

// ─── main component ────────────────────────────────────────────────────────────

export function Publications({ user }: PublicationsProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [publications, setPublications] = useState<PublicationItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');

  const [filters, setFilters]           = useState<PubFilters>(EMPTY_FILTERS);
  const [viewMode, setViewMode]         = useState<ViewMode>('lista');
  const [sortBy, setSortBy]             = useState<SortField>('data');
  const [sortDesc, setSortDesc]         = useState(true);
  const [page, setPage]                 = useState(1);
  const [selected, setSelected]         = useState<PublicationItem | null>(null);
  const [openMenuId, setOpenMenuId]     = useState<number | null>(null);
  const [obsInput, setObsInput]         = useState('');

  const PER_PAGE = 15;

  useEffect(() => {
    trackPageView('publicacoes', { role: user.role });
    loadData();
  }, [user.role]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const publicationId = params.get('publicationId');
    const processId = params.get('processId');
    const clientName = params.get('clientName');

    if (!publicationId && !processId && !clientName) return;

    setFilters((prev) => ({
      ...prev,
      process: processId ?? prev.process,
      client: processId ? prev.client : clientName ?? prev.client,
    }));
  }, [location.search]);

  useEffect(() => { setPage(1); }, [filters, sortBy, sortDesc, viewMode]);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); }
  }, [success]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getPublications();
      if (res.status !== 200 || !Array.isArray(res.data)) {
        setError(res.error || 'Não foi possível carregar publicações.');
        return;
      }
      setPublications(res.data as PublicationItem[]);
      trackEvent('publications_loaded', { count: (res.data as PublicationItem[]).length });
    } catch (err) {
      setError((err as Error).message || 'Erro ao carregar publicações.');
      captureException(err as Error, { context: 'loadPublications' });
    } finally {
      setLoading(false);
    }
  }

  function updateFilter<K extends keyof PubFilters>(k: K, v: PubFilters[K]) {
    setFilters((prev) => ({ ...prev, [k]: v }));
  }

  function clearFilters() { setFilters(EMPTY_FILTERS); setSuccess('Filtros limpos.'); }
  function saveFilters()  { localStorage.setItem('lexora_pub_filter', JSON.stringify(filters)); setSuccess('Filtro salvo.'); }

  async function refreshSelected(id: number) {
    const latest = await api.getPublication(id);
    if (latest.status === 200 && latest.data) {
      setSelected(latest.data as PublicationItem);
      setObsInput((latest.data as PublicationItem).observacoes);
    }
  }

  async function markRead(id: number) {
    const response = await api.updatePublication(id, { lida: true, status: 'lida' });
    if (response.status !== 200 || !response.data) {
      setError(response.error || 'Não foi possível atualizar a publicação.');
      return;
    }
    setPublications((prev) => prev.map((p) => p.id === id ? response.data as PublicationItem : p));
    if (selected?.id === id) await refreshSelected(id);
    setOpenMenuId(null);
    setSuccess('Publicação marcada como lida.');
  }

  async function markTratada(id: number) {
    const response = await api.updatePublication(id, { status: 'tratada', lida: true });
    if (response.status !== 200 || !response.data) {
      setError(response.error || 'Não foi possível atualizar a publicação.');
      return;
    }
    setPublications((prev) => prev.map((p) => p.id === id ? response.data as PublicationItem : p));
    if (selected?.id === id) await refreshSelected(id);
    setOpenMenuId(null);
    setSuccess('Publicação marcada como tratada.');
  }

  async function convertToPrazo(id: number) {
    const pub = publications.find((p) => p.id === id);
    const response = await api.createDeadlineFromPublication(id);
    if (response.status !== 201 && response.status !== 200 || !response.data) {
      setError(response.error || 'Não foi possível converter a publicação em prazo.');
      return;
    }
    const updatedPublication = response.data.publication as PublicationItem;
    setPublications((prev) => prev.map((p) => p.id === id ? updatedPublication : p));
    if (selected?.id === id) await refreshSelected(id);
    setOpenMenuId(null);
    trackEvent('pub_converted_prazo', {
      id,
      processId: pub?.processId ?? 0,
      deadlineId: response.data.deadline?.id ?? 0,
    });
    setSuccess('Prazo criado a partir da publicação e vinculado ao processo.');
  }

  function createTask(id: number) {
    const pub = publications.find((p) => p.id === id);
    trackEvent('pub_create_task', { id, processId: pub?.processId ?? 0 });
    setOpenMenuId(null);
    navigate('/tarefas');
  }

  async function saveObs(id: number) {
    const response = await api.updatePublication(id, { observacoes: obsInput });
    if (response.status !== 200 || !response.data) {
      setError(response.error || 'Não foi possível salvar a observação.');
      return;
    }
    setPublications((prev) => prev.map((p) => p.id === id ? response.data as PublicationItem : p));
    if (selected?.id === id) await refreshSelected(id);
    setSuccess('Observação registrada.');
  }

  function exportCsv(items: PublicationItem[]) {
    const header = ['Tipo', 'Processo', 'Cliente', 'Tribunal', 'Data', 'Status', 'Impacto', 'Resumo', 'Prazo derivado'];
    const rows = items.map((p) => [
      TIPO_LABEL[p.tipo], p.processLabel, p.client, p.tribunal,
      formatDate(p.dataPublicacao), STATUS_CFG[p.status].label,
      IMPACTO_CFG[p.impacto].label, p.resumo, p.prazoDerivedoLabel ?? '—',
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'publicacoes.csv'; link.click();
    URL.revokeObjectURL(url);
    trackEvent('publications_exported', { count: items.length });
  }

  // ─── computed ──────────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const novas     = publications.filter((p) => p.status === 'nova').length;
    const exigem    = publications.filter((p) => p.exigeAcao).length;
    const semTrat   = publications.filter((p) => p.status === 'nova' || p.status === 'lida').length;
    const prazo     = publications.filter((p) => p.convertidaEmPrazo).length;
    const criticas  = publications.filter((p) => p.impacto === 'critico').length;
    return { novas, exigem, semTrat, prazo, criticas };
  }, [publications]);

  const uniqueClients   = useMemo(() => [...new Set(publications.map((p) => p.client))].sort(), [publications]);
  const processOptions  = useMemo(
    () => [...new Map(publications.map((p) => [p.processId, { value: String(p.processId), label: `${p.processLabel} · ${p.processTitle}`, searchText: p.client }])).values()],
    [publications],
  );
  const uniqueTribunais = useMemo(() => [...new Set(publications.map((p) => p.tribunal))].sort(), [publications]);

  const filtered = useMemo(() => {
    return publications.filter((p) => {
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const hay = `${p.processLabel} ${p.processTitle} ${p.client} ${p.tribunal} ${p.resumo} ${p.origem}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.status   && p.status   !== filters.status)      return false;
      if (filters.process  && String(p.processId) !== filters.process) return false;
      if (filters.client   && p.client   !== filters.client)       return false;
      if (filters.tribunal && p.tribunal !== filters.tribunal)     return false;
      if (filters.tipo     && p.tipo     !== filters.tipo)         return false;
      if (filters.impacto  && p.impacto  !== filters.impacto)      return false;

      if (filters.period === 'hoje')   { if (!isWithinDays(p.dataPublicacao, 1))  return false; }
      if (filters.period === 'semana') { if (!isWithinDays(p.dataPublicacao, 7))  return false; }
      if (filters.period === 'mes')    { if (!isWithinDays(p.dataPublicacao, 30)) return false; }

      if (filters.exigeAcao       && !p.exigeAcao)         return false;
      if (filters.convertidaEmPrazo && !p.convertidaEmPrazo) return false;
      if (filters.naoLida         && p.lida)               return false;

      return true;
    });
  }, [publications, filters]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if      (sortBy === 'data')     cmp = a.dataPublicacao.localeCompare(b.dataPublicacao);
      else if (sortBy === 'processo') cmp = a.processLabel.localeCompare(b.processLabel);
      else if (sortBy === 'status')   cmp = a.status.localeCompare(b.status);
      else if (sortBy === 'impacto') {
        const order: Record<PubImpacto, number> = { critico: 0, alto: 1, medio: 2, baixo: 3, informativo: 4 };
        cmp = order[a.impacto] - order[b.impacto];
      }
      return sortDesc ? -cmp : cmp;
    });
    return arr;
  }, [filtered, sortBy, sortDesc]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const publicationId = params.get('publicationId');
    const processId = params.get('processId');
    const clientName = params.get('clientName');
    if (!publications.length || (!publicationId && !processId && !clientName)) return;

    const focused = [...publications]
      .filter((item) => {
        if (publicationId) return String(item.id) === publicationId;
        if (processId) return String(item.processId) === processId;
        if (clientName) return item.client === clientName;
        return false;
      })
      .sort((a, b) => b.dataPublicacao.localeCompare(a.dataPublicacao))[0];

    if (!focused) return;
    setSelected(focused);
    setObsInput(focused.observacoes);
  }, [location.search, publications]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const pageItems  = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const hasActiveFilters = Object.entries(filters).some(([, v]) => typeof v === 'boolean' ? v : v !== '');

  // timeline grouping by date
  const byDate = useMemo(() => {
    const map = new Map<string, PublicationItem[]>();
    for (const p of sorted) {
      if (!map.has(p.dataPublicacao)) map.set(p.dataPublicacao, []);
      map.get(p.dataPublicacao)!.push(p);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [sorted]);

  // ─── row render ────────────────────────────────────────────────────────────

  function renderRow(item: PublicationItem) {
    const isOpen = openMenuId === item.id;
    return (
      <tr
        key={item.id}
        className={`pub-table-row${!item.lida ? ' pub-table-row--unread' : ''}${item.impacto === 'critico' ? ' pub-table-row--critico' : ''}`}
        onClick={() => { setSelected(item); setObsInput(item.observacoes); }}
        tabIndex={0}
        aria-label={`Publicação ${TIPO_LABEL[item.tipo]} — ${item.processLabel} — ${item.client}`}
        onKeyDown={(e) => e.key === 'Enter' && setSelected(item)}
      >
        <td className="pub-td-pub">
          <TipoChip tipo={item.tipo} />
          <span className="pub-resumo-preview">{item.resumo}</span>
          {!item.lida && <span className="pub-unread-dot" aria-label="Não lida" />}
        </td>
        <td className="pub-td-process">
          <span className="pub-proc-label">{item.processLabel}</span>
          <span className="pub-proc-title">{item.processTitle}</span>
        </td>
        <td className="pub-td-client">{item.client}</td>
        <td className="pub-td-tribunal">
          <span className="pub-tribunal-chip">{item.tribunal}</span>
        </td>
        <td className="pub-td-data">{formatDate(item.dataPublicacao)}</td>
        <td><StatusBadge status={item.status} /></td>
        <td><ImpactoBadge impacto={item.impacto} /></td>
        <td className="pub-td-prazo">
          {item.prazoDerivedoLabel
            ? <span className="pub-prazo-chip"><Clock size={11} aria-hidden="true" />{item.prazoDerivedoLabel}</span>
            : <span className="pub-none">—</span>
          }
        </td>
        <td className="pub-td-actions" onClick={(e) => e.stopPropagation()}>
          <div className="pub-menu-wrap">
            <button
              className="pub-menu-trigger"
              aria-label={`Ações para publicação ${item.processLabel}`}
              aria-expanded={isOpen}
              aria-haspopup="true"
              onClick={() => setOpenMenuId(isOpen ? null : item.id)}
            >
              <MoreHorizontal size={15} />
            </button>
            {isOpen && (
              <ul className="pub-ctx-menu" role="menu">
                <li role="none">
                  <button role="menuitem" onClick={() => { setSelected(item); setObsInput(item.observacoes); setOpenMenuId(null); }}>
                    <BookOpen size={13} /> Ver detalhe
                  </button>
                </li>
                <li role="none">
                  <button role="menuitem" onClick={() => markRead(item.id)} disabled={item.lida}>
                    <Eye size={13} /> Marcar como lida
                  </button>
                </li>
                <li role="none">
                  <button role="menuitem" onClick={() => markTratada(item.id)} disabled={item.status === 'tratada'}>
                    <CheckCircle2 size={13} /> Marcar como tratada
                  </button>
                </li>
                <li role="none">
                  <button role="menuitem" onClick={() => convertToPrazo(item.id)} disabled={item.convertidaEmPrazo}>
                    <Clock size={13} /> Criar prazo
                  </button>
                </li>
                <li role="none">
                  <button role="menuitem" onClick={() => createTask(item.id)}>
                    <ClipboardList size={13} /> Criar tarefa
                  </button>
                </li>
                <li role="none">
                  <button role="menuitem" onClick={() => { navigate(`/processos/${item.processId}`); setOpenMenuId(null); }}>
                    <ExternalLink size={13} /> Abrir processo
                  </button>
                </li>
              </ul>
            )}
          </div>
        </td>
      </tr>
    );
  }

  // ─── JSX ─────────────────────────────────────────────────────────────────

  return (
    <div className="publications-page" onClick={() => { if (openMenuId) setOpenMenuId(null); }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="pub-header-card">
        <div>
          <p className="pub-eyebrow">Monitoramento Judicial</p>
          <h2>Publicações e Intimações</h2>
          <p className="pub-subtitle">
            Monitore novas publicações, identifique impacto e transforme cada intimação em ação jurídica com rastreabilidade.
          </p>
        </div>
        <div className="pub-header-actions">
          <button className="btn-primary" onClick={loadData} aria-label="Atualizar publicações">
            <RefreshCw size={14} /> Atualizar
          </button>
          <button
            className="btn-secondary"
            onClick={() => { if (selected) convertToPrazo(selected.id); else setSuccess('Selecione uma publicação primeiro.'); }}
            aria-label="Criar prazo a partir da publicação selecionada"
          >
            <Plus size={14} /> Criar Prazo
          </button>
          <button className="btn-secondary" onClick={() => exportCsv(sorted)} aria-label="Exportar publicações como CSV">
            <Download size={14} /> Exportar
          </button>
        </div>
      </div>

      {/* ── Alerts ──────────────────────────────────────────────── */}
      {error && (
        <div className="pub-alert pub-alert--error" role="alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={loadData} aria-label="Tentar novamente"><RefreshCw size={14} /> Tentar novamente</button>
        </div>
      )}
      {success && (
        <div className="pub-alert pub-alert--success" role="status" aria-live="polite">
          <CheckCircle2 size={16} /><span>{success}</span>
        </div>
      )}

      {/* ── KPIs ────────────────────────────────────────────────── */}
      <div className="pub-kpis" aria-label="Indicadores de publicações">
        <div className="pub-kpi-card">
          <p>Novas publicações</p>
          <strong>{loading ? '—' : kpis.novas}</strong>
        </div>
        <div className="pub-kpi-card pub-kpi-card--warning">
          <p>Exigem ação</p>
          <strong>{loading ? '—' : kpis.exigem}</strong>
        </div>
        <div className="pub-kpi-card pub-kpi-card--danger">
          <p>Sem tratamento</p>
          <strong>{loading ? '—' : kpis.semTrat}</strong>
        </div>
        <div className="pub-kpi-card pub-kpi-card--success">
          <p>Convertidas em prazo</p>
          <strong>{loading ? '—' : kpis.prazo}</strong>
        </div>
        <div className="pub-kpi-card pub-kpi-card--critico">
          <p>Críticas</p>
          <strong>{loading ? '—' : kpis.criticas}</strong>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="pub-filters">
        <div className="pub-filters-top">
          <div className="pub-field pub-field--search">
            <label htmlFor="pub-search" className="sr-only">Buscar publicação</label>
            <span className="pub-input-wrap">
              <Search size={14} aria-hidden="true" />
              <input
                id="pub-search"
                type="search"
                placeholder="Buscar por processo, cliente, tribunal, conteúdo ou origem…"
                value={filters.query}
                onChange={(e) => updateFilter('query', e.target.value)}
              />
            </span>
          </div>

          <div className="pub-field">
            <label htmlFor="pub-period">Período</label>
            <select id="pub-period" value={filters.period} onChange={(e) => updateFilter('period', e.target.value)}>
              <option value="">Todos</option>
              <option value="hoje">Hoje</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mês</option>
            </select>
          </div>

          <div className="pub-field">
            <label htmlFor="pub-status">Status</label>
            <select id="pub-status" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
              <option value="">Todos</option>
              {(Object.entries(STATUS_CFG) as [PubStatus, { label: string }][]).map(([k, v]) =>
                <option key={k} value={k}>{v.label}</option>
              )}
            </select>
          </div>

          <div className="pub-field">
            <label htmlFor="pub-process">Processo</label>
            <ProcessCombobox id="pub-process" value={filters.process} onChange={(value) => updateFilter('process', value)} options={processOptions} placeholder="Buscar processo" emptyLabel="Todos" />
          </div>

          <div className="pub-field">
            <label htmlFor="pub-client">Cliente</label>
            <select id="pub-client" value={filters.client} onChange={(e) => updateFilter('client', e.target.value)}>
              <option value="">Todos</option>
              {uniqueClients.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="pub-field">
            <label htmlFor="pub-tribunal">Tribunal</label>
            <select id="pub-tribunal" value={filters.tribunal} onChange={(e) => updateFilter('tribunal', e.target.value)}>
              <option value="">Todos</option>
              {uniqueTribunais.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="pub-field">
            <label htmlFor="pub-tipo">Tipo</label>
            <select id="pub-tipo" value={filters.tipo} onChange={(e) => updateFilter('tipo', e.target.value)}>
              <option value="">Todos</option>
              {(Object.entries(TIPO_LABEL) as [PubTipo, string][]).map(([k, v]) =>
                <option key={k} value={k}>{v}</option>
              )}
            </select>
          </div>

          <div className="pub-field">
            <label htmlFor="pub-impacto">Impacto</label>
            <select id="pub-impacto" value={filters.impacto} onChange={(e) => updateFilter('impacto', e.target.value)}>
              <option value="">Todos</option>
              {(Object.entries(IMPACTO_CFG) as [PubImpacto, { label: string }][]).map(([k, v]) =>
                <option key={k} value={k}>{v.label}</option>
              )}
            </select>
          </div>
        </div>

        <div className="pub-filters-bottom">
          <label className="pub-checkline">
            <input
              type="checkbox"
              checked={filters.exigeAcao}
              onChange={(e) => updateFilter('exigeAcao', e.target.checked)}
              aria-label="Mostrar apenas publicações que exigem ação"
            />
            Exige ação
          </label>
          <label className="pub-checkline">
            <input
              type="checkbox"
              checked={filters.convertidaEmPrazo}
              onChange={(e) => updateFilter('convertidaEmPrazo', e.target.checked)}
              aria-label="Mostrar apenas publicações convertidas em prazo"
            />
            Convertida em prazo
          </label>
          <label className="pub-checkline">
            <input
              type="checkbox"
              checked={filters.naoLida}
              onChange={(e) => updateFilter('naoLida', e.target.checked)}
              aria-label="Mostrar apenas publicações não lidas"
            />
            Não lida
          </label>

          <div className="pub-filter-actions">
            {hasActiveFilters && (
              <span className="pub-filter-summary">
                <Filter size={12} />
                <strong>{filtered.length}</strong> de {publications.length}
              </span>
            )}
            <button className="btn-ghost" onClick={clearFilters} aria-label="Limpar todos os filtros">
              <X size={13} /> Limpar
            </button>
            <button className="btn-ghost" onClick={saveFilters} aria-label="Salvar filtro atual">
              <Save size={13} /> Salvar filtro
            </button>
          </div>

          <div className="pub-view-toggle" role="group" aria-label="Modo de visualização">
            {(['lista', 'timeline'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                className={`pub-view-btn${viewMode === mode ? ' pub-view-btn--active' : ''}`}
                onClick={() => setViewMode(mode)}
                aria-pressed={viewMode === mode}
              >
                {mode === 'lista' ? 'Lista' : 'Timeline'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Loading ──────────────────────────────────────────────── */}
      {loading && (
        <div className="pub-loading" aria-live="polite" aria-busy="true">
          <RefreshCw size={20} className="pub-spin" aria-hidden="true" />
          <span>Carregando publicações…</span>
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────── */}
      {!loading && !error && (
        <>
          {publications.length === 0 && (
            <div className="pub-empty">
              <Bell size={32} aria-hidden="true" />
              <h3>Nenhuma publicação monitorada</h3>
              <p>Quando novas publicações forem detectadas nos diários, elas aparecerão aqui automaticamente.</p>
              <button className="btn-primary" onClick={loadData}>
                <RefreshCw size={13} /> Verificar agora
              </button>
            </div>
          )}

          {publications.length > 0 && filtered.length === 0 && (
            <div className="pub-empty">
              <Filter size={32} aria-hidden="true" />
              <h3>Nenhuma publicação para este filtro</h3>
              <p>Ajuste os critérios ou limpe os filtros para ver todas as publicações.</p>
              <button className="btn-secondary" onClick={clearFilters}>
                <X size={13} /> Limpar filtros
              </button>
            </div>
          )}

          {/* ── Lista ───────────────────────────────────────────── */}
          {filtered.length > 0 && viewMode === 'lista' && (
            <div className="pub-table-card">
              <div className="pub-table-header">
                <span className="pub-count-badge">
                  {filtered.length} publicaç{filtered.length !== 1 ? 'ões' : 'ão'}
                </span>
                <div className="pub-sort-controls">
                  <label htmlFor="pub-sort" className="sr-only">Ordenar por</label>
                  <select id="pub-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortField)} aria-label="Ordenar por">
                    <option value="data">Data</option>
                    <option value="impacto">Impacto</option>
                    <option value="status">Status</option>
                    <option value="processo">Processo</option>
                  </select>
                  <button
                    className="btn-ghost pub-sort-dir"
                    onClick={() => setSortDesc((d) => !d)}
                    aria-label={sortDesc ? 'Decrescente' : 'Crescente'}
                  >
                    {sortDesc ? '↓' : '↑'}
                  </button>
                </div>
              </div>

              <div className="pub-table-wrap">
                <table className="pub-table" aria-label="Lista de publicações">
                  <thead>
                    <tr>
                      <th scope="col">Publicação</th>
                      <th scope="col">Processo</th>
                      <th scope="col">Cliente</th>
                      <th scope="col">Tribunal / Origem</th>
                      <th scope="col">Data</th>
                      <th scope="col">Status</th>
                      <th scope="col">Impacto</th>
                      <th scope="col">Prazo derivado</th>
                      <th scope="col"><span className="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item) => renderRow(item))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="pub-pagination" aria-label="Paginação">
                  <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior">Anterior</button>
                  <span aria-live="polite">{page} / {totalPages}</span>
                  <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Próxima página">Próximo</button>
                </div>
              )}
            </div>
          )}

          {/* ── Timeline ─────────────────────────────────────────── */}
          {filtered.length > 0 && viewMode === 'timeline' && (
            <div className="pub-timeline-card">
              <div className="pub-timeline" aria-label="Timeline de publicações">
                {byDate.map(([date, items]) => (
                  <div key={date} className="pub-timeline-group">
                    <div className="pub-timeline-date-label">
                      <Calendar size={12} aria-hidden="true" />
                      {formatDate(date)}
                      <span className="pub-timeline-date-count">{items.length}</span>
                    </div>
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`pub-timeline-item${item.impacto === 'critico' ? ' pub-timeline-item--critico' : ''}${!item.lida ? ' pub-timeline-item--unread' : ''}`}
                        onClick={() => { setSelected(item); setObsInput(item.observacoes); }}
                        tabIndex={0}
                        role="button"
                        aria-label={`${TIPO_LABEL[item.tipo]} — ${item.processLabel} — ${item.client}`}
                        onKeyDown={(e) => e.key === 'Enter' && setSelected(item)}
                      >
                        <div className={`pub-timeline-dot pub-timeline-dot--${IMPACTO_CFG[item.impacto].variant}`} aria-hidden="true" />
                        <div className="pub-timeline-content">
                          <div className="pub-timeline-top">
                            <TipoChip tipo={item.tipo} />
                            <span className="pub-timeline-proc">{item.processLabel}</span>
                            <span className="pub-timeline-client">{item.client}</span>
                            <span className="pub-timeline-tribunal">{item.tribunal}</span>
                            <ImpactoBadge impacto={item.impacto} />
                            <StatusBadge status={item.status} />
                            {!item.lida && <span className="pub-unread-dot" aria-label="Não lida" />}
                          </div>
                          <p className="pub-timeline-resumo">{item.resumo}</p>
                          {item.prazoDerivedoLabel && (
                            <span className="pub-prazo-chip pub-prazo-chip--sm">
                              <Clock size={11} aria-hidden="true" /> {item.prazoDerivedoLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Drawer ───────────────────────────────────────────────── */}
      {selected && (
        <>
          <div
            className="pub-drawer-overlay"
            onClick={() => setSelected(null)}
            aria-hidden="true"
          />
          <aside
            className="pub-drawer pub-drawer--open"
            role="complementary"
            aria-label={`Detalhe: ${TIPO_LABEL[selected.tipo]} — ${selected.processLabel}`}
          >
            <div className="pub-drawer-top">
              <div>
                <TipoChip tipo={selected.tipo} />
                <h3>{selected.processLabel} · {selected.processTitle}</h3>
              </div>
              <button className="pub-close-btn" onClick={() => setSelected(null)} aria-label="Fechar detalhe">
                <X size={16} />
              </button>
            </div>

            <div className="pub-drawer-body">
              {/* Status + impacto row */}
              <div className="pub-drawer-row2">
                <div className="pub-drawer-section">
                  <span className="pub-drawer-label">Status</span>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="pub-drawer-section">
                  <span className="pub-drawer-label">Impacto</span>
                  <ImpactoBadge impacto={selected.impacto} />
                </div>
              </div>

              <div className="pub-drawer-row2">
                <div className="pub-drawer-section">
                  <span className="pub-drawer-label">Cliente</span>
                  <span className="pub-drawer-val">{selected.client}</span>
                </div>
                <div className="pub-drawer-section">
                  <span className="pub-drawer-label">Tribunal / Origem</span>
                  <span className="pub-drawer-val">{selected.tribunal}</span>
                </div>
              </div>

              <div className="pub-drawer-row2">
                <div className="pub-drawer-section">
                  <span className="pub-drawer-label">Data de publicação</span>
                  <span className="pub-drawer-val">{formatDate(selected.dataPublicacao)}</span>
                </div>
                <div className="pub-drawer-section">
                  <span className="pub-drawer-label">Exige ação</span>
                  <span className={`pub-drawer-val${selected.exigeAcao ? ' pub-drawer-val--alert' : ''}`}>
                    {selected.exigeAcao ? '⚠ Sim' : 'Não'}
                  </span>
                </div>
              </div>

              <div className="pub-drawer-section">
                <span className="pub-drawer-label">Origem</span>
                <span className="pub-drawer-val">{selected.origem}</span>
              </div>

              <div className="pub-drawer-section">
                <span className="pub-drawer-label">Resumo</span>
                <p className="pub-drawer-text">{selected.resumo}</p>
              </div>

              <div className="pub-drawer-section">
                <span className="pub-drawer-label">Texto relevante</span>
                <blockquote className="pub-drawer-quote">{selected.textoRelevante}</blockquote>
              </div>

              {selected.prazoDerivedoLabel && (
                <div className="pub-drawer-section">
                  <span className="pub-drawer-label">Prazo derivado</span>
                  <span className="pub-prazo-chip"><Clock size={12} aria-hidden="true" />{selected.prazoDerivedoLabel}</span>
                </div>
              )}

              {/* Observations */}
              <div className="pub-drawer-section">
                <span className="pub-drawer-label">Observações</span>
                <textarea
                  className="pub-obs-input"
                  rows={3}
                  placeholder="Registre observações sobre esta publicação…"
                  value={obsInput}
                  onChange={(e) => setObsInput(e.target.value)}
                  aria-label="Observações sobre a publicação"
                />
                <button
                  className="btn-ghost pub-save-obs"
                  onClick={() => saveObs(selected.id)}
                  disabled={obsInput === selected.observacoes}
                  aria-label="Salvar observação"
                >
                  <Save size={13} /> Salvar observação
                </button>
              </div>
            </div>

            <div className="pub-drawer-actions">
              <button
                className="btn-primary"
                onClick={() => convertToPrazo(selected.id)}
                disabled={selected.convertidaEmPrazo}
                aria-label="Criar prazo a partir desta publicação"
              >
                <Clock size={13} /> Criar prazo
              </button>
              <button
                className="btn-secondary"
                onClick={() => markTratada(selected.id)}
                disabled={selected.status === 'tratada'}
                aria-label="Marcar publicação como tratada"
              >
                <CheckCircle2 size={13} /> Marcar tratada
              </button>
              <button
                className="btn-secondary"
                onClick={() => markRead(selected.id)}
                disabled={selected.lida}
                aria-label="Marcar publicação como lida"
              >
                {selected.lida ? <Eye size={13} /> : <EyeOff size={13} />}
                {selected.lida ? 'Lida' : 'Marcar lida'}
              </button>
              <button
                className="btn-secondary"
                onClick={() => createTask(selected.id)}
                aria-label="Criar tarefa a partir desta publicação"
              >
                <ClipboardList size={13} /> Criar tarefa
              </button>
              <button
                className="btn-ghost"
                onClick={() => { navigate(`/processos/${selected.processId}`); setSelected(null); }}
                aria-label={`Abrir processo ${selected.processLabel}`}
              >
                <ExternalLink size={13} /> Abrir processo
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
