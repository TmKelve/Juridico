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
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  api,
  type ApiDerivedActionRecord,
  type ApiPublication,
  type ApiPublicationCapture,
  type ApiPublicationPipelineItem,
} from './api';
import { OriginBadgeRow } from './components/audit/OriginBadgeRow';
import { buildFallbackOriginReference } from './components/audit/origin-model';
import { loadOriginBundle } from './components/audit/loadOriginBundle';
import { OriginInsightPanel } from './components/audit/OriginInsightPanel';
import { captureException, trackEvent, trackPageView } from './monitoring';
import { ProcessCombobox } from './ProcessCombobox';
import { Button, Textarea } from './components/ui';
import './Dashboard.css';
import './Processes.css';
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

function readCaptureSourceUrl(capture: ApiPublicationCapture | null) {
  if (!capture?.metadata || typeof capture.metadata !== 'object') return null;

  const metadata = capture.metadata as Record<string, unknown>;
  const candidates = [
    metadata.sourceUrl,
    metadata.publicationUrl,
    metadata.url,
    metadata.link,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
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
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [viewMode, setViewMode]         = useState<ViewMode>('lista');
  const [sortBy, setSortBy]             = useState<SortField>('data');
  const [sortDesc, setSortDesc]         = useState(true);
  const [page, setPage]                 = useState(1);
  const [selected, setSelected]         = useState<PublicationItem | null>(null);
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [openMenuId, setOpenMenuId]     = useState<number | null>(null);
  const [obsInput, setObsInput]         = useState('');
  const [originLoading, setOriginLoading] = useState(false);
  const [originError, setOriginError] = useState('');
  const [originCapture, setOriginCapture] = useState<ApiPublicationCapture | null>(null);
  const [originTimeline, setOriginTimeline] = useState<ApiPublicationPipelineItem[]>([]);
  const [originActions, setOriginActions] = useState<ApiDerivedActionRecord[]>([]);

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

  useEffect(() => {
    let active = true;

    async function hydrateSelectedOrigin(item: PublicationItem) {
      setOriginLoading(true);
      setOriginError('');
      try {
        const bundle = await loadOriginBundle({
          originReference: item.originReference ?? null,
          correlationId: item.correlationId ?? null,
          captureId: item.captureId ?? null,
        });
        if (!active) return;
        setOriginCapture(bundle.capture);
        setOriginTimeline(bundle.timeline);
        setOriginActions(bundle.derivedActions);
        setOriginError(bundle.error);
      } catch (err) {
        if (!active) return;
        setOriginError((err as Error).message || 'Nao foi possivel carregar a origem desta publicacao.');
        setOriginCapture(null);
        setOriginTimeline([]);
        setOriginActions([]);
      } finally {
        if (active) setOriginLoading(false);
      }
    }

    if (!selected) {
      setOriginLoading(false);
      setOriginError('');
      setOriginCapture(null);
      setOriginTimeline([]);
      setOriginActions([]);
      return () => {
        active = false;
      };
    }

    void hydrateSelectedOrigin(selected);
    return () => {
      active = false;
    };
  }, [selected]);

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

  function applyQuickPreset(key: 'nova' | 'critico' | 'exigeAcao' | 'naoLida' | 'semTrat') {
    setFilters(() => {
      if (key === 'nova')      return { ...EMPTY_FILTERS, status: 'nova' };
      if (key === 'critico')   return { ...EMPTY_FILTERS, impacto: 'critico' };
      if (key === 'exigeAcao') return { ...EMPTY_FILTERS, exigeAcao: true };
      if (key === 'naoLida')   return { ...EMPTY_FILTERS, naoLida: true };
      if (key === 'semTrat')   return { ...EMPTY_FILTERS, status: 'nova' }; // sem tratamento ≈ nova
      return EMPTY_FILTERS;
    });
  }

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
    setDrawerOpen(false);
  }, [location.search, publications]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const pageItems  = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const hasActiveFilters = Object.entries(filters).some(([, v]) => typeof v === 'boolean' ? v : v !== '');
  const selectedOriginReference = useMemo(() => (
    selected
      ? buildFallbackOriginReference({
          source: selected.origem,
          originReference: selected.originReference ?? null,
          correlationId: selected.correlationId ?? null,
          captureId: selected.captureId ?? null,
          publicationId: selected.id,
          eventId: selected.eventId ?? null,
          originStage: selected.originStage ?? null,
          pipelineStatus: selected.pipelineStatus ?? null,
          consolidationStatus: selected.consolidationStatus ?? null,
        })
      : null
  ), [selected]);
  const selectedCaptureSourceUrl = useMemo(() => readCaptureSourceUrl(originCapture), [originCapture]);

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
      <div
        key={item.id}
        role="row"
        className={`pub-row${!item.lida ? ' pub-row--unread' : ''}${item.impacto === 'critico' ? ' pub-row--critico' : ''}${selected?.id === item.id ? ' pub-row--selected' : ''}`}
        data-tipo={item.tipo}
        onClick={() => { setSelected(item); setObsInput(item.observacoes); setDrawerOpen(true); }}
        tabIndex={0}
        aria-label={`Publicação ${TIPO_LABEL[item.tipo]} — ${item.processLabel} — ${item.client}`}
        onKeyDown={(e) => e.key === 'Enter' && (setSelected(item), setObsInput(item.observacoes), setDrawerOpen(true))}
      >
        {/* O QUÊ — tipo + resumo */}
        <div className="pub-row-left">
          <div className="pub-row-left-top">
            <TipoChip tipo={item.tipo} />
            {!item.lida && <span className="pub-unread-dot" aria-label="Não lida" />}
          </div>
          <p className="pub-row-resumo">{item.resumo}</p>
        </div>

        {/* ONDE — processo + cliente */}
        <div className="pub-row-mid">
          <span className="pub-row-proc-label">{item.processLabel}</span>
          <span className="pub-row-proc-title">{item.processTitle}</span>
          <span className="pub-row-client">{item.client}</span>
        </div>

        {/* METADADOS — tribunal · data · status · impacto · prazo */}
        <div className="pub-row-right">
          <div className="pub-row-meta-top">
            <span className="pub-tribunal-chip">{item.tribunal}</span>
            <span className="pub-row-date">{formatDate(item.dataPublicacao)}</span>
          </div>
          <div className="pub-row-meta-bottom">
            <StatusBadge status={item.status} />
            <ImpactoBadge impacto={item.impacto} />
            {item.prazoDerivedoLabel && (
              <span className="pub-prazo-chip">
                <Clock size={10} aria-hidden="true" />{item.prazoDerivedoLabel}
              </span>
            )}
          </div>
        </div>

        {/* AÇÕES */}
        <div className="pub-row-actions" onClick={(e) => e.stopPropagation()}>
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
                  <button role="menuitem" onClick={() => { setSelected(item); setObsInput(item.observacoes); setDrawerOpen(true); setOpenMenuId(null); }}>
                    <BookOpen size={13} /> Ver detalhe completo
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
        </div>
      </div>
    );
  }

  // ─── JSX ─────────────────────────────────────────────────────────────────

  return (
    <div className="publications-page" onClick={() => { if (openMenuId) setOpenMenuId(null); }}>

      {/* ── Hero header ─────────────────────────────────────────── */}
      <header className="pub-hero" aria-label="Cabeçalho de publicações">
        <div className="pub-hero-copy">
          <p className="pub-hero-eyebrow">Monitoramento Judicial</p>
          <h1 className="pub-hero-title">Publicações</h1>
          <p className="pub-hero-subtitle">Intimações e publicações judiciais consolidadas — identifique impacto e derive prazos com rastreabilidade.</p>
          <div className="pub-hero-chips" aria-label="Pulso do monitoramento">
            {!loading && kpis.novas > 0 && (
              <div className="pub-hero-chip" data-tone="brand">
                <strong>{kpis.novas}</strong><span>Novas</span>
              </div>
            )}
            {!loading && kpis.exigem > 0 && (
              <div className="pub-hero-chip" data-tone="warning">
                <strong>{kpis.exigem}</strong><span>Exigem ação</span>
              </div>
            )}
            {!loading && kpis.criticas > 0 && (
              <div className="pub-hero-chip" data-tone="critical">
                <strong>{kpis.criticas}</strong><span>Críticas</span>
              </div>
            )}
            <div className="pub-hero-pulse" data-tone={kpis.criticas > 0 ? 'critical' : kpis.exigem > 0 ? 'warning' : 'ok'}>
              <span className="pub-hero-pulse-dot" aria-hidden="true" />
              <span>{kpis.criticas > 0 ? 'Atenção crítica' : kpis.exigem > 0 ? 'Requer atenção' : 'Em dia'}</span>
            </div>
          </div>
        </div>
        <div className="pub-hero-actions">
          <button type="button" className="btn-primary" onClick={loadData} aria-label="Atualizar publicações">
            <RefreshCw size={15} aria-hidden="true" /> Atualizar
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/triagem')} aria-label="Abrir fila de triagem">
            <ShieldCheck size={15} aria-hidden="true" /> Triagem
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => { if (selected) convertToPrazo(selected.id); else setSuccess('Selecione uma publicação primeiro.'); }}
            aria-label="Criar prazo a partir da publicação selecionada"
          >
            <Plus size={15} aria-hidden="true" /> Criar prazo
          </button>
          <button type="button" className="btn-secondary" onClick={() => exportCsv(sorted)} aria-label="Exportar publicações como CSV">
            <Download size={15} aria-hidden="true" /> Exportar
          </button>
        </div>
      </header>

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
      <section className="pub-kpis" aria-label="Indicadores de publicações">
        <button type="button" className="metric-card" data-kpi-color="primary"
          onClick={() => applyQuickPreset('nova')}
          aria-label={`Novas publicações: ${kpis.novas}`}
        >
          <div className="metric-top-row">
            <p className="metric-value">{loading ? '—' : kpis.novas}</p>
            <div className="metric-icon" aria-hidden="true"><Bell size={16} /></div>
          </div>
          <p className="metric-label">Novas publicações</p>
          <p className="metric-microtext">Ainda não lidas ou tratadas</p>
        </button>
        <button type="button" className="metric-card" data-kpi-color="warning"
          onClick={() => applyQuickPreset('exigeAcao')}
          aria-label={`Exigem ação: ${kpis.exigem}`}
        >
          <div className="metric-top-row">
            <p className="metric-value">{loading ? '—' : kpis.exigem}</p>
            <div className="metric-icon" aria-hidden="true"><AlertTriangle size={16} /></div>
          </div>
          <p className="metric-label">Exigem ação</p>
          <p className="metric-microtext">Requerem providência imediata</p>
        </button>
        <button type="button" className="metric-card" data-kpi-color="error"
          onClick={() => applyQuickPreset('semTrat')}
          aria-label={`Sem tratamento: ${kpis.semTrat}`}
        >
          <div className="metric-top-row">
            <p className="metric-value">{loading ? '—' : kpis.semTrat}</p>
            <div className="metric-icon" aria-hidden="true"><Clock size={16} /></div>
          </div>
          <p className="metric-label">Sem tratamento</p>
          <p className="metric-microtext">Novas ou lidas sem resolução</p>
        </button>
        <button type="button" className="metric-card" data-kpi-color="success"
          onClick={() => setFilters((f) => ({ ...f, convertidaEmPrazo: true }))}
          aria-label={`Convertidas em prazo: ${kpis.prazo}`}
        >
          <div className="metric-top-row">
            <p className="metric-value">{loading ? '—' : kpis.prazo}</p>
            <div className="metric-icon" aria-hidden="true"><CheckCircle2 size={16} /></div>
          </div>
          <p className="metric-label">Convertidas em prazo</p>
          <p className="metric-microtext">Prazo derivado registrado</p>
        </button>
        <button type="button" className="metric-card" data-kpi-color="error"
          onClick={() => applyQuickPreset('critico')}
          aria-label={`Críticas: ${kpis.criticas}`}
        >
          <div className="metric-top-row">
            <p className="metric-value">{loading ? '—' : kpis.criticas}</p>
            <div className="metric-icon" aria-hidden="true"><ShieldCheck size={16} /></div>
          </div>
          <p className="metric-label">Críticas</p>
          <p className="metric-microtext">Impacto crítico identificado</p>
        </button>
      </section>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <section
        className={`my-processes-filters${filtersExpanded ? '' : ' is-compact'}`}
        aria-label="Busca e filtros de publicações"
      >
        {/* Cabeçalho do painel */}
        <div className="filters-head">
          <div>
            <p className="filters-eyebrow">Refinar publicações</p>
            <h3>Filtros operacionais</h3>
          </div>
          <div className="filters-head-meta">
            {hasActiveFilters && <span className="filters-active-pill">Filtros ativos</span>}
            <span className="filters-total-pill">{filtered.length} em exibição</span>
            <div className="pub-view-toggle" role="group" aria-label="Modo de visualização">
              {(['lista', 'timeline'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`pub-view-btn${viewMode === mode ? ' pub-view-btn--active' : ''}`}
                  onClick={() => setViewMode(mode)}
                  aria-pressed={viewMode === mode}
                >
                  {mode === 'lista' ? 'Lista' : 'Timeline'}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn-ghost btn-filter-density"
              onClick={() => setFiltersExpanded((v) => !v)}
              aria-expanded={filtersExpanded}
            >
              <Filter size={14} aria-hidden="true" />
              {filtersExpanded ? 'Menos filtros' : 'Mais filtros'}
            </button>
          </div>
        </div>

        {/* Preset chips */}
        <div className="filter-presets" role="toolbar" aria-label="Presets de filtros rápidos">
          <button type="button" className="filter-preset-btn" onClick={() => applyQuickPreset('nova')}>Novas</button>
          <button type="button" className="filter-preset-btn" onClick={() => applyQuickPreset('critico')}>Críticas</button>
          <button type="button" className="filter-preset-btn" onClick={() => applyQuickPreset('exigeAcao')}>Exigem ação</button>
          <button type="button" className="filter-preset-btn" onClick={() => applyQuickPreset('naoLida')}>Não lidas</button>
          <button type="button" className="filter-preset-btn" onClick={() => updateFilter('period', 'hoje')}>Hoje</button>
        </div>

        {/* Linha principal */}
        <div className="filters-top-row filter-row-card">
          <label htmlFor="pub-search" className="filter-field filter-field-search filter-cascade-item">
            <span>Busca</span>
            <div className="filter-input-wrap">
              <Search size={14} aria-hidden="true" />
              <input
                id="pub-search"
                type="search"
                placeholder="Processo, cliente, tribunal, conteúdo…"
                value={filters.query}
                onChange={(e) => updateFilter('query', e.target.value)}
                aria-label="Buscar publicação"
              />
            </div>
          </label>
          <label htmlFor="pub-status" className="filter-field filter-cascade-item">
            <span>Status</span>
            <select id="pub-status" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
              <option value="">Todos</option>
              {(Object.entries(STATUS_CFG) as [PubStatus, { label: string }][]).map(([k, v]) =>
                <option key={k} value={k}>{v.label}</option>
              )}
            </select>
          </label>
          <label htmlFor="pub-impacto" className="filter-field filter-cascade-item">
            <span>Impacto</span>
            <select id="pub-impacto" value={filters.impacto} onChange={(e) => updateFilter('impacto', e.target.value)}>
              <option value="">Todos</option>
              {(Object.entries(IMPACTO_CFG) as [PubImpacto, { label: string }][]).map(([k, v]) =>
                <option key={k} value={k}>{v.label}</option>
              )}
            </select>
          </label>
          <label htmlFor="pub-period" className="filter-field filter-cascade-item">
            <span>Período</span>
            <select id="pub-period" value={filters.period} onChange={(e) => updateFilter('period', e.target.value)}>
              <option value="">Todos</option>
              <option value="hoje">Hoje</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mês</option>
            </select>
          </label>
        </div>

        {/* Filtros avançados (expansíveis) */}
        {filtersExpanded && (
          <div className="filters-bottom-row filter-row-card">
            <label htmlFor="pub-process" className="filter-field filter-cascade-item" style={{ gridColumn: 'span 4' }}>
              <span>Processo</span>
              <ProcessCombobox id="pub-process" value={filters.process} onChange={(value) => updateFilter('process', value)} options={processOptions} placeholder="Buscar processo" emptyLabel="Todos" />
            </label>
            <label htmlFor="pub-client" className="filter-field filter-cascade-item">
              <span>Cliente</span>
              <select id="pub-client" value={filters.client} onChange={(e) => updateFilter('client', e.target.value)}>
                <option value="">Todos</option>
                {uniqueClients.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label htmlFor="pub-tribunal" className="filter-field filter-cascade-item">
              <span>Tribunal</span>
              <select id="pub-tribunal" value={filters.tribunal} onChange={(e) => updateFilter('tribunal', e.target.value)}>
                <option value="">Todos</option>
                {uniqueTribunais.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label htmlFor="pub-tipo" className="filter-field filter-cascade-item">
              <span>Tipo</span>
              <select id="pub-tipo" value={filters.tipo} onChange={(e) => updateFilter('tipo', e.target.value)}>
                <option value="">Todos</option>
                {(Object.entries(TIPO_LABEL) as [PubTipo, string][]).map(([k, v]) =>
                  <option key={k} value={k}>{v}</option>
                )}
              </select>
            </label>
            <div className="filter-toggle-group filter-cascade-item" role="group" aria-label="Filtros booleanos" style={{ gridColumn: 'span 4' }}>
              <label className="filter-toggle-chip">
                <input type="checkbox" checked={filters.exigeAcao} onChange={(e) => updateFilter('exigeAcao', e.target.checked)} />
                <span>Exige ação</span>
              </label>
              <label className="filter-toggle-chip">
                <input type="checkbox" checked={filters.convertidaEmPrazo} onChange={(e) => updateFilter('convertidaEmPrazo', e.target.checked)} />
                <span>Convertida em prazo</span>
              </label>
              <label className="filter-toggle-chip">
                <input type="checkbox" checked={filters.naoLida} onChange={(e) => updateFilter('naoLida', e.target.checked)} />
                <span>Não lida</span>
              </label>
            </div>
            <div className="filter-actions filter-cascade-item" style={{ gridColumn: 'span 4' }}>
              <button type="button" className="btn-ghost btn-filter-clear" onClick={clearFilters}>
                <Filter size={14} aria-hidden="true" /> Limpar filtros
              </button>
              <button type="button" className="btn-ghost" onClick={saveFilters}>
                <Save size={14} aria-hidden="true" /> Salvar filtro
              </button>
            </div>
          </div>
        )}
      </section>

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
              <Button onClick={loadData}>
                <RefreshCw size={13} /> Verificar agora
              </Button>
            </div>
          )}

          {publications.length > 0 && filtered.length === 0 && (
            <div className="pub-empty">
              <Filter size={32} aria-hidden="true" />
              <h3>Nenhuma publicação para este filtro</h3>
              <p>Ajuste os critérios ou limpe os filtros para ver todas as publicações.</p>
              <Button variant="outline" onClick={clearFilters}>
                <X size={13} /> Limpar filtros
              </Button>
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
                    <Button
                      variant="ghost"
                      className="pub-sort-dir"
                      onClick={() => setSortDesc((d) => !d)}
                      aria-label={sortDesc ? 'Decrescente' : 'Crescente'}
                    >
                      {sortDesc ? '↓' : '↑'}
                    </Button>
                  </div>
                </div>

                {/* Cabeçalho da lista */}
                <div className="pub-list-header" aria-hidden="true">
                  <span className="pub-list-col-label">Publicação</span>
                  <span className="pub-list-col-label">Processo / Cliente</span>
                  <span className="pub-list-col-label">Tribunal · Data · Status · Impacto</span>
                  <span />
                </div>

                {/* Lista de itens */}
                <div className="pub-list" role="list" aria-label="Lista de publicações">
                  {pageItems.map((item) => renderRow(item))}
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
                        onClick={() => { setSelected(item); setObsInput(item.observacoes); setDrawerOpen(true); }}
                        tabIndex={0}
                        role="button"
                        aria-label={`${TIPO_LABEL[item.tipo]} — ${item.processLabel} — ${item.client}`}
                        onKeyDown={(e) => e.key === 'Enter' && (setSelected(item), setObsInput(item.observacoes), setDrawerOpen(true))}
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
                            <OriginBadgeRow
                              originReference={buildFallbackOriginReference({
                                source: item.origem,
                                originReference: item.originReference ?? null,
                                correlationId: item.correlationId ?? null,
                                captureId: item.captureId ?? null,
                                publicationId: item.id,
                                eventId: item.eventId ?? null,
                                originStage: item.originStage ?? null,
                                pipelineStatus: item.pipelineStatus ?? null,
                                consolidationStatus: item.consolidationStatus ?? null,
                              })}
                              originStage={item.originStage}
                              pipelineStatus={item.pipelineStatus}
                              consolidationStatus={item.consolidationStatus}
                              compact
                            />
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
      {selected && drawerOpen && (
        <>
          <div
            className="pub-drawer-overlay"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="pub-drawer pub-drawer--open"
            data-tipo={selected.tipo}
            role="complementary"
            aria-label={`Detalhe: ${TIPO_LABEL[selected.tipo]} — ${selected.processLabel}`}
          >
            {/* ── Hero ── */}
            <div className="pub-drawer-hero">
              <div className="pub-drawer-hero-content">
                <div className="pub-drawer-hero-tags">
                  <TipoChip tipo={selected.tipo} />
                  {!selected.lida && <span className="pub-drawer-pill pub-drawer-pill--unread">Não lida</span>}
                  {selected.exigeAcao && <span className="pub-drawer-pill pub-drawer-pill--warn">⚠ Exige ação</span>}
                  {selected.impacto === 'critico' && <span className="pub-drawer-pill pub-drawer-pill--critico">Crítico</span>}
                </div>
                <h2 className="pub-drawer-hero-title">
                  <span className="pub-drawer-hero-proc">{selected.processLabel}</span>
                  <span className="pub-drawer-hero-sep" aria-hidden="true">·</span>
                  <span className="pub-drawer-hero-name">{selected.processTitle}</span>
                </h2>
                <p className="pub-drawer-hero-meta">
                  <span>{selected.client}</span>
                  <span className="pub-drawer-hero-dot" aria-hidden="true" />
                  <span>{selected.tribunal}</span>
                  <span className="pub-drawer-hero-dot" aria-hidden="true" />
                  <span>{formatDate(selected.dataPublicacao)}</span>
                </p>
                <div className="pub-drawer-hero-status">
                  <StatusBadge status={selected.status} />
                  <ImpactoBadge impacto={selected.impacto} />
                  {selected.prazoDerivedoLabel && (
                    <span className="pub-prazo-chip">
                      <Clock size={10} aria-hidden="true" />{selected.prazoDerivedoLabel}
                    </span>
                  )}
                </div>
              </div>
              <button
                className="pub-close-btn"
                onClick={() => setDrawerOpen(false)}
                aria-label="Fechar detalhe"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Quick actions ── */}
            <div className="pub-drawer-quickbar">
              <button
                type="button"
                className={`pub-qbtn${selected.lida ? ' pub-qbtn--done' : ''}`}
                onClick={() => markRead(selected.id)}
                disabled={selected.lida}
                title="Marcar como lida"
              >
                <Eye size={14} />
                <span>{selected.lida ? 'Lida' : 'Marcar lida'}</span>
              </button>
              <button
                type="button"
                className={`pub-qbtn${selected.status === 'tratada' ? ' pub-qbtn--done' : ''}`}
                onClick={() => markTratada(selected.id)}
                disabled={selected.status === 'tratada'}
                title="Marcar como tratada"
              >
                <CheckCircle2 size={14} />
                <span>{selected.status === 'tratada' ? 'Tratada' : 'Tratar'}</span>
              </button>
              <button
                type="button"
                className={`pub-qbtn pub-qbtn--primary${selected.convertidaEmPrazo ? ' pub-qbtn--done' : ''}`}
                onClick={() => convertToPrazo(selected.id)}
                disabled={selected.convertidaEmPrazo}
                title="Criar prazo derivado"
              >
                <Clock size={14} />
                <span>{selected.convertidaEmPrazo ? 'Prazo criado' : 'Criar prazo'}</span>
              </button>
              <button
                type="button"
                className="pub-qbtn"
                onClick={() => createTask(selected.id)}
                title="Criar tarefa"
              >
                <ClipboardList size={14} />
                <span>Criar tarefa</span>
              </button>
              {/* spacer empurra os links para a direita */}
              <div className="pub-qbtn-spacer" aria-hidden="true" />
              <button
                type="button"
                className="pub-qbtn pub-qbtn--ghost"
                onClick={() => { navigate(`/processos/${selected.processId}`); setDrawerOpen(false); }}
                title={`Abrir processo ${selected.processLabel}`}
              >
                <ExternalLink size={14} />
                <span>Processo</span>
              </button>
              {selectedCaptureSourceUrl && (
                <button
                  type="button"
                  className="pub-qbtn pub-qbtn--ghost"
                  onClick={() => window.open(selectedCaptureSourceUrl, '_blank', 'noopener,noreferrer')}
                  title="Abrir publicação captada"
                >
                  <ExternalLink size={14} />
                  <span>Publicação</span>
                </button>
              )}
            </div>

            {/* ── Body scrollável ── */}
            <div className="pub-drawer-body">

              {/* Metadata grid */}
              <div className="pub-drawer-meta-grid">
                <div className="pub-drawer-meta-item">
                  <span className="pub-drawer-meta-label">Cliente</span>
                  <span className="pub-drawer-meta-val">{selected.client}</span>
                </div>
                <div className="pub-drawer-meta-item">
                  <span className="pub-drawer-meta-label">Tribunal / Origem</span>
                  <span className="pub-drawer-meta-val">{selected.tribunal}</span>
                </div>
                <div className="pub-drawer-meta-item">
                  <span className="pub-drawer-meta-label">Data de publicação</span>
                  <span className="pub-drawer-meta-val">{formatDate(selected.dataPublicacao)}</span>
                </div>
                <div className="pub-drawer-meta-item">
                  <span className="pub-drawer-meta-label">Exige ação</span>
                  <span className={`pub-drawer-meta-val${selected.exigeAcao ? ' pub-drawer-meta-val--alert' : ''}`}>
                    {selected.exigeAcao ? '⚠ Sim — requer providência' : 'Não'}
                  </span>
                </div>
                <div className="pub-drawer-meta-item pub-drawer-meta-item--full">
                  <span className="pub-drawer-meta-label">Origem da captura</span>
                  <span className="pub-drawer-meta-val">{selected.origem}</span>
                </div>
              </div>

              {/* Resumo */}
              <div className="pub-drawer-section">
                <span className="pub-drawer-section-eyebrow">Resumo</span>
                <p className="pub-drawer-resumo-text">{selected.resumo}</p>
              </div>

              {/* Trecho relevante */}
              {selected.textoRelevante && (
                <div className="pub-drawer-section">
                  <span className="pub-drawer-section-eyebrow">Trecho relevante</span>
                  <blockquote className="pub-drawer-quote">{selected.textoRelevante}</blockquote>
                </div>
              )}

              {/* Observações */}
              <div className="pub-drawer-section">
                <span className="pub-drawer-section-eyebrow">Observações internas</span>
                <Textarea
                  className="pub-obs-input"
                  rows={3}
                  placeholder="Registre observações sobre esta publicação…"
                  value={obsInput}
                  onChange={(e) => setObsInput(e.target.value)}
                  aria-label="Observações sobre a publicação"
                />
                <Button
                  variant="ghost"
                  className="pub-save-obs"
                  onClick={() => saveObs(selected.id)}
                  disabled={obsInput === selected.observacoes}
                  aria-label="Salvar observação"
                >
                  <Save size={13} /> Salvar observação
                </Button>
              </div>

              {/* Rastreabilidade */}
              <div className="pub-drawer-origin-section">
                <OriginInsightPanel
                  title="Capturas e sinais relacionados"
                  originReference={selectedOriginReference}
                  originStage={selected.originStage}
                  pipelineStatus={selected.pipelineStatus}
                  consolidationStatus={selected.consolidationStatus}
                  capture={originCapture}
                  timeline={originTimeline.length ? originTimeline : (selected.timeline ?? [])}
                  derivedActions={originActions.length ? originActions : (selected.derivedActions ?? [])}
                  loading={originLoading}
                  error={originError}
                  fallbackEvidenceText={selected.textoRelevante}
                  summary={selected.resumo}
                />
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
